// --- UTILS ---
let currentCurrency = '₦';
const formatMoney = (amount) => currentCurrency + (amount || 0).toLocaleString();
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();

window.formatMoney = formatMoney;
window.formatDate = formatDate;
window.setCurrency = (symbol) => { currentCurrency = symbol; };

// --- DATABASE SERVICE ---
const CloudStorage = {
    loadSettings: async () => {
        try {
            const doc = await db.collection('app').doc('settings').get();
            if (doc.exists) return doc.data();
            const defaultSettings = {
                businessName: 'Yomola Global',
                adminPin: '0000',
                theme: 'dark',
                currency: 'NGN',
                maintenanceMode: false,
                systemAlert: ''
            };
            await db.collection('app').doc('settings').set(defaultSettings);
            return defaultSettings;
        } catch (e) { return { businessName: 'Yomola Global', adminPin: '0000', theme: 'dark', currency: 'NGN' }; }
    },
    updateSettings: async (settings) => {
        await db.collection('app').doc('settings').update(settings);
    },
    loadClients: async () => {
        const snapshot = await db.collection('clients').orderBy('name').get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    addClient: async (clientData) => {
        const docRef = await db.collection('clients').add({
            ...clientData,
            balance: 0,
            passwordCreated: false,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...clientData };
    },
    updateClient: async (clientId, data) => {
        await db.collection('clients').doc(clientId).update(data);
    },
    deleteClient: async (clientId) => {
        const batch = db.batch();

        // Cascade delete: find and delete all transactions for this client
        const txSnapshot = await db.collection('transactions').where('clientId', '==', clientId).get();
        txSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete any pending requests as well
        const reqSnapshot = await db.collection('requests').where('clientId', '==', clientId).get();
        reqSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the client profile
        batch.delete(db.collection('clients').doc(clientId));

        await batch.commit();
    },
    getClientByPhone: async (phone) => {
        const snapshot = await db.collection('clients').where('phone', '==', phone).limit(1).get();
        if (snapshot.empty) return null;
        return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
    },
    loadStaff: async () => {
        const snapshot = await db.collection('staff').orderBy('name').get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    addStaff: async (staffData) => {
        const docRef = await db.collection('staff').add({
            ...staffData,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...staffData };
    },
    deleteStaff: async (staffId) => {
        await db.collection('staff').doc(staffId).delete();
    },
    getStaffByPin: async (pin) => {
        const snapshot = await db.collection('staff').where('pin', '==', pin).limit(1).get();
        if (snapshot.empty) return null;
        return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
    },
    updateClientPassword: async (clientId, password, email) => {
        await db.collection('clients').doc(clientId).update({
            password,
            email,
            passwordCreated: true
        });
    },
    loadTransactions: async (clientId = null) => {
        let query = db.collection('transactions').orderBy('date', 'desc');
        if (clientId) query = query.where('clientId', '==', clientId);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    addTransaction: async (tx, currentBalance) => {
        const batch = db.batch();
        const txId = Date.now().toString();
        const txRef = db.collection('transactions').doc(txId);
        batch.set(txRef, tx);
        const clientRef = db.collection('clients').doc(tx.clientId);
        const newBalance = tx.type === 'DEPOSIT' ? (currentBalance + tx.amount) : (currentBalance - tx.amount);
        batch.update(clientRef, { balance: newBalance });
        await batch.commit();
    },
    addRequest: async (request) => {
        await db.collection('requests').add({
            ...request,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });
    },
    loadRequests: async () => {
        const snapshot = await db.collection('requests').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    updateRequestStatus: async (requestId, status) => {
        await db.collection('requests').doc(requestId).update({ status });
    }
};

// --- REPORT GENERATOR ---
const ReportGenerator = {
    generateClientStatement: (client, transactions, businessName) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const primaryColor = [37, 99, 235]; // #2563eb

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName || 'Yomola Global', 15, 25);
        doc.setFontSize(10);
        doc.text('STATEMENT OF ACCOUNT', 15, 33);

        // Client Info Info Box
        doc.setFillColor(245, 250, 255);
        doc.rect(15, 50, 180, 40, 'F');
        doc.setTextColor(...primaryColor);
        doc.setFontSize(12);
        doc.text('CLIENT DETAILS', 25, 60);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${client.name}`, 25, 70);
        doc.text(`Phone: ${client.phone}`, 25, 76);
        doc.text(`Wallet ID: ${client.id}`, 25, 82);

        // Balance Box
        doc.setFillColor(37, 99, 235);
        doc.rect(130, 50, 65, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('CURRENT BALANCE', 135, 65);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(window.formatMoney(client.balance), 135, 78);

        // Table
        const tableData = transactions.map(t => [
            window.formatDate(t.date),
            t.type,
            t.method,
            window.formatMoney(t.amount),
            t.recordedBy || 'System'
        ]);

        doc.autoTable({
            startY: 100,
            head: [['Date', 'Type', 'Method', 'Amount', 'Officer']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { top: 100 }
        });

        doc.save(`Statement_${client.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    },

    generateGeneralCashflow: (transactions, clients, businessName) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const accentColor = [15, 23, 42]; // #0f172a

        doc.setFillColor(...accentColor);
        doc.rect(0, 0, 210, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(businessName || 'Yomola Global', 15, 25);
        doc.setFontSize(12);
        doc.text('GENERAL CASHFLOW LEDGER', 15, 35);

        const totalInflow = transactions.filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + t.amount, 0);
        const totalOutflow = transactions.filter(t => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amount, 0);

        doc.setFontSize(10);
        doc.text(`Total Inflow: ${window.formatMoney(totalInflow)}`, 200, 25, { align: 'right' });
        doc.text(`Total Outflow: ${window.formatMoney(totalOutflow)}`, 200, 35, { align: 'right' });

        const tableData = transactions.map(t => [
            window.formatDate(t.date),
            clients.find(c => c.id === t.clientId)?.name || 'Unknown',
            t.type,
            window.formatMoney(t.amount),
            t.recordedBy || 'System'
        ]);

        doc.autoTable({
            startY: 55,
            head: [['Date', 'Client', 'Type', 'Amount', 'Recorded By']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: accentColor, textColor: 255 },
            styles: { fontSize: 8 }
        });

        doc.save(`General_Cashflow_${Date.now()}.pdf`);
    },

    exportToExcel: (transactions, clients) => {
        const headers = ['Date', 'Client Name', 'Type', 'Amount', 'Method', 'Officer'];
        const rows = transactions.map(t => [
            window.formatDate(t.date),
            clients.find(c => c.id === t.clientId)?.name || 'Unknown',
            t.type,
            t.amount,
            t.method,
            t.recordedBy || 'System'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Cashflow_Export_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.CloudStorage = CloudStorage;
window.ReportGenerator = ReportGenerator;

const CloudStorage = {
    loadSettings: async () => {
        try {
            const doc = await db.collection('app').doc('settings').get();
            if (doc.exists) return doc.data();
            const defaultSettings = { businessName: 'Yomola Global', adminPin: null };
            await db.collection('app').doc('settings').set(defaultSettings);
            return defaultSettings;
        } catch (e) {
            console.error("Load settings error:", e);
            return { businessName: 'Yomola Global', adminPin: null };
        }
    },

    loadClients: async () => {
        try {
            const snapshot = await db.collection('clients').get();
            return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (e) {
            console.error("Load clients error:", e);
            return [];
        }
    },

    getClientByPhone: async (phone) => {
        try {
            const snapshot = await db.collection('clients').where('phone', '==', phone).limit(1).get();
            if (snapshot.empty) return null;
            return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        } catch (e) {
            console.error("Get client by phone error:", e);
            return null;
        }
    },

    addClient: async (client) => {
        try {
            const ref = await db.collection('clients').add({
                ...client,
                balance: 0,
                createdAt: new Date().toISOString()
            });
            return { ...client, id: ref.id, balance: 0 };
        } catch (e) {
            console.error("Add client error:", e);
            throw e;
        }
    },

    updateClientPassword: async (clientId, password, email) => {
        try {
            await db.collection('clients').doc(clientId).update({
                password,
                email,
                passwordCreated: true
            });
        } catch (e) {
            console.error("Update password error:", e);
            throw e;
        }
    },

    loadTransactions: async (clientId = null) => {
        try {
            let query = db.collection('transactions').orderBy('date', 'desc');
            if (clientId) {
                query = query.where('clientId', '==', clientId);
            }
            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (e) {
            console.error("Load transactions error:", e);
            return [];
        }
    },

    addTransaction: async (tx, currentBalance) => {
        try {
            const batch = db.batch();
            const txId = Date.now().toString();
            const txRef = db.collection('transactions').doc(txId);
            batch.set(txRef, tx);
            const clientRef = db.collection('clients').doc(tx.clientId);
            const newBalance = tx.type === 'DEPOSIT' ? currentBalance + tx.amount : currentBalance - tx.amount;
            batch.update(clientRef, { balance: newBalance });
            await batch.commit();
            return { ...tx, id: txId, newBalance };
        } catch (e) {
            console.error("Add transaction error:", e);
            throw e;
        }
    }
};

window.CloudStorage = CloudStorage;

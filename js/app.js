const { useState, useEffect, useMemo } = React;
const { Icon, Card, Button, Input, ActivityList, TransactionTable } = window.UI;

// --- ROUTER UTILS ---
const useRouter = () => {
    const [hash, setHash] = useState(window.location.hash);
    useEffect(() => {
        const onHashChange = () => setHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);
    // Parse routes like: #/dashboard/transactions
    const path = hash.replace('#/', '').split('/');
    return {
        path,
        fullHash: hash,
        navigate: (to) => window.location.hash = '/' + to
    };
};

// --- AUTH SCREEN ---
const AuthScreen = ({ onLoginSuccess, forceStep }) => {
    const { navigate } = useRouter();
    const [step, setStep] = useState(forceStep || 'phone');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userContext, setUserContext] = useState(null);

    useEffect(() => {
        if (forceStep) setStep(forceStep);
        setError('');
    }, [forceStep]);

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (phone.length < 10) return setError("Enter a valid phone number");
        setLoading(true);
        const client = await window.CloudStorage.getClientByPhone(phone);
        setLoading(false);
        if (client) {
            setUserContext(client);
            client.passwordCreated ? setStep('login') : setStep('create');
        } else {
            setError("Account not found. Please contact Admin.");
        }
    };

    const handleCreatePassword = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length !== 4) return setError("PIN must be 4 characters");
        if (password !== confirmPassword) return setError("PINs do not match");
        if (!email.includes('@')) return setError("Valid email required");

        setLoading(true);
        try {
            await window.CloudStorage.updateClientPassword(userContext.id, password, email);
            onLoginSuccess({ ...userContext, role: 'client', password, email });
        } catch (e) { setError("Setup failed"); }
        setLoading(false);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === userContext.password) onLoginSuccess({ ...userContext, role: 'client' });
        else setError("Incorrect PIN");
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        const s = await window.CloudStorage.loadSettings();
        if (adminKey === s.adminPin) {
            onLoginSuccess({ name: 'System Admin', role: 'admin' });
            return;
        }
        const staff = await window.CloudStorage.getStaffByPin(adminKey);
        if (staff) {
            onLoginSuccess({ ...staff, role: 'staff' });
        } else {
            setError("Invalid Administrative Key");
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 auth-container">
            <div className="w-full max-w-md auth-form">
                <Card className="p-10 border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full tracking-tighter"></div>
                    <div className="mb-10 text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20">
                            <Icon name="shield-check" className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">Security Portal</h2>
                        <p className="text-gray-500 mt-2 font-medium">Verify your identity to continue</p>
                    </div>

                    {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl font-bold flex items-center gap-2 animate-shake"><Icon name="alert-circle" className="w-4 h-4" /> {error}</div>}

                    {step === 'phone' && (
                        <form onSubmit={handlePhoneSubmit} className="space-y-6">
                            <Input label="Phone Number" icon="phone" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="080..." maxLength={11} />
                            <Button className="w-full" disabled={loading}>{loading ? 'Verifying...' : 'Continue'}</Button>
                        </form>
                    )}
                    {step === 'create' && (
                        <form onSubmit={handleCreatePassword} className="space-y-4">
                            <p className="text-sm text-blue-400 bg-blue-500/10 p-3 rounded-lg">Welcome! Please create a secure 4-digit PIN for your account.</p>
                            <Input type="password" label="Create 4-Digit PIN" icon="lock" value={password} onChange={e => setPassword(e.target.value)} maxLength={4} />
                            <Input type="password" label="Confirm PIN" icon="check-circle" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} maxLength={4} />
                            <Input type="email" label="Recovery Email" icon="mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                            <Button className="w-full" variant="success">Initialize Account</Button>
                        </form>
                    )}
                    {step === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <p className="text-gray-300">Welcome, <span className="text-white font-bold">{userContext.name}</span></p>
                            <Input type="password" label="Enter PIN" icon="key" value={password} onChange={e => setPassword(e.target.value)} maxLength={4} />
                            <Button className="w-full">Unlock Dashboard</Button>
                        </form>
                    )}
                    {step === 'admin' && (
                        <form onSubmit={handleAdminLogin} className="space-y-6">
                            <h2 className="text-xl font-bold text-orange-400 text-center">Administrative Access</h2>
                            <Input type="password" label="4-Digit Portal Key" icon="shield" value={adminKey} onChange={e => setAdminKey(e.target.value)} maxLength={4} />
                            <Button className="w-full" variant="danger">Access Terminal</Button>
                        </form>
                    )}
                    <button onClick={() => navigate('portal')} className="w-full text-sm text-gray-500 mt-6 hover:text-gray-300 transition">Back to Selection</button>
                </Card>
            </div>
        </div>
    );
};

// --- DASHBOARD ---
const Dashboard = ({ user, onLogout }) => {
    const { path, navigate } = useRouter();
    // path[0] == 'dashboard', path[1] == subview (e.g. 'transactions')
    const view = path[1] || 'home';

    const isFullAdmin = user.role === 'admin';
    const isStaff = user.role === 'staff';
    const isAdminView = isFullAdmin || isStaff;

    const [transactions, setTransactions] = useState([]);
    const [clients, setClients] = useState([]);
    const [staff, setStaff] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // { type, data }
    const [settings, setSettings] = useState({
        businessName: 'Yomola Global',
        adminPin: '0000',
        theme: 'dark',
        currency: 'NGN',
        maintenanceMode: false,
        systemAlert: ''
    });
    const [currentUserBalance, setCurrentUserBalance] = useState(user.balance || 0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const refreshData = async () => {
        setLoading(true);
        const s = await window.CloudStorage.loadSettings();
        setSettings(s);

        window.setCurrency({ 'NGN': '₦', 'USD': '$', 'EUR': '€', 'GBP': '£' }[s.currency] || '₦');
        document.body.classList.toggle('light-theme', s.theme === 'light');

        if (isAdminView) {
            const [cls, txs, stf, reqs] = await Promise.all([
                window.CloudStorage.loadClients(),
                window.CloudStorage.loadTransactions(),
                window.CloudStorage.loadStaff(),
                window.CloudStorage.loadRequests()
            ]);
            setClients(cls); setTransactions(txs); setStaff(stf); setRequests(reqs);
        } else {
            const txs = await window.CloudStorage.loadTransactions(user.id);
            setTransactions(txs);
            const snapshot = await window.db.collection('clients').doc(user.id).get();
            if (snapshot.exists) {
                setCurrentUserBalance(snapshot.data().balance || 0);
            }
        }
        setLoading(false);
    };

    useEffect(() => { refreshData(); }, [user]);

    useEffect(() => {
        document.body.classList.toggle('light-theme', settings.theme === 'light');
        window.setCurrency({ 'NGN': '₦', 'USD': '$', 'EUR': '€', 'GBP': '£' }[settings.currency] || '₦');
    }, [settings.theme, settings.currency]);

    const balance = isAdminView ? clients.reduce((s, c) => s + (c.balance || 0), 0) : currentUserBalance;

    const stats = useMemo(() => {
        if (!isAdminView) return null;
        const totalHoldings = clients.reduce((s, c) => s + (c.balance || 0), 0);
        const today = new Date().toISOString().split('T')[0];
        const todayDeposits = transactions
            .filter(t => t.type === 'DEPOSIT' && t.date.startsWith(today))
            .reduce((s, t) => s + t.amount, 0);
        const activeClients = clients.length;
        return { totalHoldings, todayDeposits, activeClients };
    }, [clients, transactions, isAdminView]);

    const handleTransactionSubmit = async (data) => {
        try {
            const tx = {
                clientId: data.clientId,
                type: data.type,
                amount: parseFloat(data.amount),
                method: data.method,
                date: new Date().toISOString(),
                recordedBy: user.name
            };
            const client = clients.find(c => c.id === tx.clientId);
            await window.CloudStorage.addTransaction(tx, client.balance);

            if (data.requestId) {
                await window.CloudStorage.updateRequestStatus(data.requestId, 'APPROVED');
            }

            setModal(null);
            refreshData();
        } catch (e) { alert("Transaction failed"); }
    };

    const handleAddClient = async (data) => {
        try {
            await window.CloudStorage.addClient(data);
            setModal(null);
            refreshData();
        } catch (e) { alert("Failed to add client"); }
    };

    const handleEditClient = async (clientId, data) => {
        try {
            await window.CloudStorage.updateClient(clientId, data);
            setModal(null);
            refreshData();
        } catch (e) { alert("Update failed"); }
    };

    const handleDeleteClient = async (clientId) => {
        if (confirm("Are you sure you want to permanently delete this client? All their transaction records will also be deleted. This cannot be undone.")) {
            try {
                await window.CloudStorage.deleteClient(clientId);
                refreshData();
            } catch (e) { alert("Deletion failed"); }
        }
    };

    const handleAddStaff = async (data) => {
        try {
            await window.CloudStorage.addStaff(data);
            setModal(null);
            refreshData();
        } catch (e) { alert("Failed to add staff"); }
    };

    const handleRevokeStaff = async (staffId) => {
        if (confirm("Are you sure you want to revoke access?")) {
            await window.CloudStorage.deleteStaff(staffId);
            refreshData();
        }
    };

    const handleUpdateSettings = async (newSettings) => {
        try {
            await window.CloudStorage.updateSettings(newSettings);
            setSettings(newSettings);
            alert("Settings updated successfully");
        } catch (e) { alert("Failed to update settings"); }
    };

    const handleRequestWithdrawal = async (data) => {
        try {
            await window.CloudStorage.addRequest({
                clientId: user.id,
                clientName: user.name,
                amount: parseFloat(data.amount),
                method: data.method,
                note: data.note || ''
            });
            setModal(null);
            alert("Withdrawal request submitted for review.");
            refreshData();
        } catch (e) { alert("Request failed"); }
    };

    // Helper for navigation
    const go = (subview) => {
        navigate(`dashboard/${subview}`);
        setSidebarOpen(false);
    }

    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden font-['Outfit'] relative">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden absolute top-6 right-6 z-50 p-3 bg-blue-600 rounded-xl shadow-lg text-white">
                <Icon name={sidebarOpen ? "x" : "menu"} />
            </button>

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 glass border-r border-white/10 p-6 flex flex-col gap-8 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                        <Icon name="activity" className="text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tighter text-white">Yomola</span>
                </div>
                <nav className="flex-1 space-y-2">
                    <button onClick={() => go('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'home' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'}`}>
                        <Icon name="layout-dashboard" /> Dashboard
                    </button>
                    <button onClick={() => go('transactions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'transactions' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'}`}>
                        <Icon name="list" /> Transactions
                    </button>
                    {isAdminView && (
                        <>
                            <button onClick={() => go('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'clients' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'}`}>
                                <Icon name="users" /> Clients
                            </button>
                            <button onClick={() => go('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'requests' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'} relative`}>
                                <Icon name="bell" /> Requests
                                {requests.filter(r => r.status === 'PENDING').length > 0 && <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[#0f172a] font-bold">{requests.filter(r => r.status === 'PENDING').length}</span>}
                            </button>
                            <button onClick={() => go('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'reports' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'}`}>
                                <Icon name="file-text" /> Reports
                            </button>
                            {isFullAdmin && (
                                <>
                                    <button onClick={() => go('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'staff' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'}`}>
                                        <Icon name="shield-half" /> Staff
                                    </button>
                                    <button onClick={() => go('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'settings' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:bg-white/5'}`}>
                                        <Icon name="settings" /> Settings
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </nav>
                <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold shadow-lg shadow-blue-500/10 text-white">
                            {user.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                        <Icon name="log-out" /> Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-4 md:p-12 relative">
                {settings.systemAlert && (
                    <div className="mb-8 p-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center gap-4 animate-pulse">
                        <div className="p-2 bg-blue-600 rounded-lg"><Icon name="megaphone" className="text-white w-5 h-5" /></div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">System Broadcast</p>
                            <p className="text-white font-bold text-sm md:text-base">{settings.systemAlert}</p>
                        </div>
                    </div>
                )}

                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white capitalize">{view === 'home' ? 'Central Command' : view}</h2>
                        <p className="text-gray-500 text-sm">{isStaff ? 'Staff Terminal' : isFullAdmin ? 'System Command Center' : 'Personal Wealth Portal'}</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <Button variant="secondary" onClick={() => refreshData()} icon="refresh-cw" className="text-xs py-2 whitespace-nowrap">Sync</Button>
                        <Button variant="danger" onClick={onLogout} icon="log-out" className="text-xs py-2 whitespace-nowrap">Exit</Button>
                        {isFullAdmin && view === 'clients' && <Button onClick={() => setModal({ type: 'addClient' })} icon="user-plus" className="text-xs py-2 whitespace-nowrap">New Client</Button>}
                        {isFullAdmin && view === 'staff' && <Button onClick={() => setModal({ type: 'addStaff' })} icon="shield" className="text-xs py-2 whitespace-nowrap">Add Staff</Button>}
                    </div>
                </header>

                {view === 'home' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card className="lg:col-span-2 bg-gradient-to-br from-blue-900/40 to-indigo-900/20 border-blue-500/30 relative overflow-hidden backdrop-blur-xl">
                                <Icon name="wallet" className="absolute -bottom-10 -right-10 w-64 h-64 text-blue-500/5 rotate-12" />
                                <p className="text-sm font-medium text-blue-400 uppercase tracking-[0.2em] mb-4">{isAdminView ? 'Managed Wealth' : 'Personal Savings'}</p>
                                <h3 className="text-7xl font-black mb-10 tracking-tighter text-white drop-shadow-2xl">{window.formatMoney(balance)}</h3>
                                <div className="flex gap-4 relative z-10">
                                    {isAdminView ? (
                                        <>
                                            <Button onClick={() => setModal({ type: 'transaction' })} variant="primary" className="glow scale-105">Record Entry</Button>
                                            <Button variant="secondary" className="glass bg-white/5 border-white/10" onClick={() => window.ReportGenerator.generateGeneralCashflow(transactions, clients, settings.businessName)} icon="file-text">PDF Ledger</Button>
                                            <Button variant="secondary" className="glass bg-white/5 border-white/10" onClick={() => window.ReportGenerator.exportToExcel(transactions, clients)} icon="table">Excel</Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button onClick={() => setModal({ type: 'withdrawal' })} variant="primary" className="glow">Withdrawal Request</Button>
                                            <Button variant="secondary" className="glass bg-white/5 border-white/10" onClick={() => window.ReportGenerator.generateClientStatement({ ...user, balance: currentUserBalance }, transactions, settings.businessName)} icon="download">Statement</Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                            <Card className="flex flex-col justify-between border-emerald-500/20 bg-emerald-500/5">
                                <div>
                                    <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl inline-block mb-6 shadow-2xl shadow-emerald-500/20 animate-pulse">
                                        <Icon name="trending-up" className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-2xl font-bold text-white">System Status</h4>
                                    <p className="text-sm text-gray-400 mt-3 leading-relaxed">Infrastructure is active with 3D encryption and real-time reconciliation enabled.</p>
                                </div>
                                <div className="pt-6 border-t border-white/5 mt-6 flex justify-between items-center text-xs uppercase tracking-widest text-gray-500 font-bold">
                                    {!isAdminView && <Button variant="secondary" className="glass border-white/10 py-1 px-3 text-[10px]" onClick={() => window.ReportGenerator.generateClientStatement({ ...user, balance: currentUserBalance }, transactions, settings.businessName)} icon="download">Statement</Button>}
                                    <span className="text-emerald-400">Verified</span>
                                </div>
                            </Card>
                        </div>

                        {isAdminView && stats && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl">
                                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Today's Deposits</p>
                                    <h4 className="text-3xl font-black text-white">{window.formatMoney(stats.todayDeposits)}</h4>
                                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest"><Icon name="clock" className="w-3 h-3" /> Daily Inflow</div>
                                </Card>
                                <Card className="border-indigo-500/20 bg-indigo-500/5 backdrop-blur-xl">
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Active Clients</p>
                                    <h4 className="text-3xl font-black text-white">{stats.activeClients}</h4>
                                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest"><Icon name="users" className="w-3 h-3" /> Verified Wallets</div>
                                </Card>
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-3xl font-bold text-white tracking-tight">Recent Activity</h3>
                                <button onClick={() => go('transactions')} className="text-blue-400 text-sm font-bold hover:underline">View All Records</button>
                            </div>
                            <ActivityList loading={loading} transactions={transactions} isAdminView={isAdminView} />
                        </div>

                        {isAdminView && requests.filter(r => r.status === 'PENDING').length > 0 && (
                            <div className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-3xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Pending Notices</h3>
                                    <button onClick={() => go('requests')} className="text-blue-400 text-xs font-bold hover:underline uppercase tracking-widest">Open Terminal</button>
                                </div>
                                <div className="space-y-4">
                                    {requests.filter(r => r.status === 'PENDING').map(r => (
                                        <div key={r.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div>
                                                <p className="font-bold text-white">{r.clientName}</p>
                                                <p className="text-xs text-gray-500 uppercase tracking-widest">{window.formatMoney(r.amount)} • {r.method}</p>
                                                {r.note && <p className="text-[10px] text-blue-400 italic mt-1">{r.note}</p>}
                                            </div>
                                            <Button variant="primary" className="text-[10px] py-1 px-3" onClick={() => go('requests')}>Review</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'clients' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients.map(c => (
                            <Card key={c.id} className="hover:bg-white/5 transition-colors group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform text-white">{c.name.charAt(0)}</div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Current Balance</p>
                                        <p className="text-xl font-bold text-white">{window.formatMoney(c.balance)}</p>
                                    </div>
                                </div>
                                <h4 className="text-lg font-bold text-white truncate">{c.name}</h4>
                                <p className="text-sm text-gray-500 mb-6">{c.phone}</p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <Button variant="secondary" className="text-xs py-2 px-0 glass border-white/5" onClick={() => setModal({ type: 'transaction', data: c })}>Record</Button>
                                    <Button variant="secondary" className="text-xs py-2 px-0 glass border-white/5" disabled={!isFullAdmin} onClick={() => setModal({ type: 'editClient', data: c })}>Edit Profile</Button>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <Button variant="secondary" className="flex-1 text-xs py-2 px-0 glass border-white/10 text-blue-400" onClick={() => window.ReportGenerator.generateClientStatement(c, transactions.filter(t => t.clientId === c.id), settings.businessName)} icon="file-text">Statement</Button>
                                    {isFullAdmin && <Button variant="danger" className="flex-1 text-xs py-2 px-0 bg-red-500/10 text-red-400 border-red-500/20" onClick={() => handleDeleteClient(c.id)} icon="trash-2">Delete</Button>}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {view === 'transactions' && (
                    <Card className="overflow-hidden p-0 border-white/5">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white">Full Transaction Ledger</h3>
                            <div className="flex gap-2">
                                <Button variant="secondary" className="text-xs py-1" onClick={() => window.ReportGenerator.exportToExcel(transactions, clients)} icon="table">Export Excel</Button>
                                <Button variant="secondary" className="text-xs py-1" onClick={() => window.ReportGenerator.generateGeneralCashflow(transactions, clients, settings.businessName)} icon="printer">Print PDF</Button>
                            </div>
                        </div>
                        <TransactionTable transactions={transactions} clients={clients} />
                    </Card>
                )}

                {view === 'reports' && (
                    <div className="space-y-6">
                        <Card className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/30">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Statement Generator</h3>
                                    <p className="text-gray-400 text-sm">Download or print full financial statements for your records.</p>
                                </div>
                                <div className="flex gap-4">
                                    <Button className="glass border-white/10" variant="secondary" onClick={() => window.ReportGenerator.exportToExcel(transactions, clients)} icon="table">Export Excel</Button>
                                    <Button className="glow" onClick={() => window.ReportGenerator.generateGeneralCashflow(transactions, clients, settings.businessName)} icon="download">Download PDF Ledger</Button>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-0 overflow-hidden border-white/5">
                            <div className="p-8 text-center bg-white/5 border-b border-white/5">
                                <h2 className="text-2xl font-black text-white">{settings.businessName}</h2>
                                <p className="text-xs text-gray-500 uppercase tracking-[0.3em] mt-2">Official Financial Statement</p>
                            </div>
                            <div className="p-8"><TransactionTable transactions={transactions} clients={clients} /></div>
                        </Card>
                    </div>
                )}

                {view === 'staff' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {staff.map(s => (
                            <Card key={s.id} className="border-orange-500/20 bg-orange-500/5">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-2xl flex items-center justify-center"><Icon name="shield" className="w-6 h-6" /></div>
                                    <div>
                                        <h4 className="font-bold text-white">{s.name}</h4>
                                        <p className="text-xs text-orange-400 font-bold uppercase tracking-widest">Portal Access PIN: {s.pin}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" className="flex-1 text-xs glass border-white/5 py-2">Activity</Button>
                                    <Button variant="danger" className="flex-1 text-xs py-2" onClick={() => handleRevokeStaff(s.id)}>Revoke</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {view === 'requests' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-3xl font-bold text-white tracking-tight">Pending Withdrawal Requests</h3>
                            <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{requests.filter(r => r.status === 'PENDING').length} New Notices</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {requests.length > 0 ? requests.map(r => (
                                <Card key={r.id} className={`flex items-center justify-between transition-all ${r.status === 'PENDING' ? 'border-blue-500/30 bg-blue-500/5' : 'opacity-50'}`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-2xl ${r.status === 'PENDING' ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-800 text-gray-500'}`}><Icon name="banknote" className="w-6 h-6" /></div>
                                        <div>
                                            <p className="font-bold text-lg text-white">{r.clientName}</p>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Requested {window.formatMoney(r.amount)} • {r.method} • {window.formatDate(r.createdAt)}</p>
                                            {r.note && <p className="text-sm text-blue-400 italic mt-1 pb-1">"{r.note}"</p>}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {r.status === 'PENDING' && <Button variant="primary" className="text-xs py-2" onClick={() => {
                                            const client = clients.find(c => c.id === r.clientId);
                                            // Automated choice: set type to 'WITHDRAWAL' by default when approving a request
                                            setModal({ type: 'transaction', data: { ...client, type: 'WITHDRAWAL', amount: r.amount, method: r.method, requestId: r.id, note: `Withdrawal Approved: ${r.note}` } });
                                        }}>Approve & Process</Button>}
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${r.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-500'}`}>{r.status}</span>
                                    </div>
                                </Card>
                            )) : (
                                <div className="glass p-20 text-center text-gray-500 rounded-3xl border-dashed border-white/5">
                                    <Icon name="bell-off" className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-medium">No pending withdrawal requests at the moment.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'settings' && (
                    <div className="max-w-3xl space-y-8">
                        <Card className="p-8 border-blue-500/20 bg-blue-500/5">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white"><Icon name="sliders" className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">System Environment</h3>
                                    <p className="text-sm text-gray-500">Manage global portal configurations and security.</p>
                                </div>
                            </div>
                            <form className="space-y-8" onSubmit={(e) => {
                                e.preventDefault();
                                const f = new FormData(e.target);
                                handleUpdateSettings({
                                    businessName: f.get('businessName'),
                                    adminPin: f.get('adminPin'),
                                    theme: f.get('theme'),
                                    currency: f.get('currency'),
                                    systemAlert: f.get('systemAlert'),
                                    maintenanceMode: f.get('maintenanceMode') === 'on'
                                });
                            }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Input label="Business Identity" name="businessName" defaultValue={settings.businessName} icon="building" required />
                                    <Input label="Admin Portal PIN" name="adminPin" defaultValue={settings.adminPin} maxLength={4} icon="key" required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Interface Theme</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${settings.theme === 'dark' ? 'border-blue-600 bg-blue-600/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
                                                <input type="radio" name="theme" value="dark" defaultChecked={settings.theme === 'dark'} className="hidden" onChange={() => setSettings({ ...settings, theme: 'dark' })} />
                                                <Icon name="moon" className={settings.theme === 'dark' ? 'text-blue-400' : 'text-gray-500'} />
                                                <span className={`font-bold ${settings.theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>Deep Dark</span>
                                            </label>
                                            <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${settings.theme === 'light' ? 'border-blue-600 bg-blue-600/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
                                                <input type="radio" name="theme" value="light" defaultChecked={settings.theme === 'light'} className="hidden" onChange={() => setSettings({ ...settings, theme: 'light' })} />
                                                <Icon name="sun" className={settings.theme === 'light' ? 'text-blue-400' : 'text-gray-500'} />
                                                <span className={`font-bold ${settings.theme === 'light' ? 'text-white' : 'text-gray-500'}`}>Soft Light</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Default Currency</label>
                                        <select name="currency" defaultValue={settings.currency} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none">
                                            <option value="NGN">NGN (₦) - Naira</option>
                                            <option value="USD">USD ($) - US Dollar</option>
                                            <option value="EUR">EUR (€) - Euro</option>
                                            <option value="GBP">GBP (£) - British Pound</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Broadcast Alert Message</label><span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Displays to all users</span></div>
                                    <textarea name="systemAlert" defaultValue={settings.systemAlert} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold min-h-[100px]" placeholder="Enter system announcement..."></textarea>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                                    <div className="p-2 bg-orange-500/20 rounded-lg"><Icon name="alert-triangle" className="text-orange-400" /></div>
                                    <div className="flex-1"><p className="font-bold text-white text-sm">Maintenance Mode</p><p className="text-xs text-gray-500">Enable this to restricted client access while you perform updates.</p></div>
                                    <input type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode} className="w-6 h-6 rounded-lg bg-white/5 border-white/10 accent-orange-500" />
                                </div>
                                <Button variant="primary" className="w-full py-4 text-lg glow" icon="save">Commit System Changes</Button>
                            </form>
                        </Card>
                    </div>
                )}
            </main>

            {modal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-xl" onClick={() => setModal(null)}></div>
                    <div className="relative z-10 w-full max-w-lg">
                        <Card className="border-white/10 p-6 md:p-8 shadow-3xl bg-[#1e293b]/50 backdrop-blur-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                                    {modal.type === 'transaction' ? 'RECORD ENTRY' : modal.type === 'addClient' ? 'CREATE WALLET' : modal.type === 'editClient' ? 'UPDATE PROFILE' : 'PROVISION STAFF'}
                                </h3>
                                <button onClick={() => setModal(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"><Icon name="x" /></button>
                            </div>

                            {modal.type === 'transaction' && (
                                <form className="space-y-6" onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.target);
                                    handleTransactionSubmit({ clientId: f.get('clientId'), type: f.get('type'), amount: f.get('amount'), method: f.get('method'), requestId: f.get('requestId') });
                                }}>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Select Client</label>
                                        <select name="clientId" className="w-full bg-gray-800/50 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none" defaultValue={modal.data?.id || ''} required>
                                            <option value="" disabled>Choose a wallet...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({window.formatMoney(c.balance)})</option>)}
                                        </select>
                                        {modal.data?.requestId && <input type="hidden" name="requestId" value={modal.data.requestId} />}
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Method</label>
                                            <select name="method" className="w-full bg-gray-800/50 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none" defaultValue={modal.data?.method || 'Cash'}>
                                                <option value="Cash">Cash</option>
                                                <option value="Transfer">Bank Transfer</option>
                                                <option value="POS">POS Terminal</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Type</label>
                                            <select name="type" className="w-full bg-gray-800/50 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none" defaultValue={modal.data?.type || 'DEPOSIT'}>
                                                <option value="DEPOSIT" className="text-emerald-400">Deposit</option>
                                                <option value="WITHDRAWAL" className="text-red-400">Withdrawal</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Input label="Amount" name="amount" type="number" icon="banknote" placeholder="0.00" defaultValue={modal.data?.amount || ''} required />
                                    <Button className="w-full" variant="primary">Authorize Transaction</Button>
                                </form>
                            )}

                            {modal.type === 'addClient' && (
                                <form className="space-y-6" onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.target);
                                    handleAddClient({ name: f.get('name'), phone: f.get('phone') });
                                }}>
                                    <Input label="Full Name" name="name" icon="user" placeholder="E.g. John Doe" required />
                                    <Input label="Phone Number" name="phone" icon="phone" placeholder="080..." maxLength={11} required />
                                    <Button className="w-full" variant="primary">Register Client Wallet</Button>
                                </form>
                            )}

                            {modal.type === 'editClient' && (
                                <form className="space-y-6" onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.target);
                                    handleEditClient(modal.data.id, { name: f.get('name'), phone: f.get('phone') });
                                }}>
                                    <Input label="Full Name" name="name" defaultValue={modal.data.name} icon="user" required />
                                    <Input label="Phone Number" name="phone" defaultValue={modal.data.phone} icon="phone" maxLength={11} required />
                                    <Button className="w-full" variant="primary">Update Profile</Button>
                                </form>
                            )}

                            {modal.type === 'addStaff' && (
                                <form className="space-y-6" onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.target);
                                    handleAddStaff({ name: f.get('name'), pin: f.get('pin') });
                                }}>
                                    <Input label="Staff Name" name="name" icon="shield" placeholder="Officer Name" required />
                                    <Input label="Security PIN" name="pin" type="text" icon="key" placeholder="4-Digit PIN" maxLength={4} required />
                                    <Button className="w-full" variant="danger">Provision Access Port</Button>
                                </form>
                            )}

                            {modal.type === 'withdrawal' && (
                                <form className="space-y-6" onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.target);
                                    handleRequestWithdrawal({ amount: f.get('amount'), method: f.get('method'), note: f.get('note') });
                                }}>
                                    <Input label="Withdrawal Amount" name="amount" type="number" icon="banknote" placeholder="0.00" required />
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Preferred Method</label>
                                        <select name="method" className="w-full bg-gray-800/50 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none"><option value="Transfer">Bank Transfer</option><option value="Cash">Cash Pickup</option></select>
                                    </div>
                                    <div className="space-y-2"><label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Additional Notes (Optional)</label><textarea name="note" className="w-full bg-gray-800/50 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold min-h-[80px]" placeholder="Bank details or reason..."></textarea></div>
                                    <Button className="w-full" variant="primary">Submit Request</Button>
                                </form>
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </div >
    );
};

// --- LANDING PAGE ---
const LandingPage = ({ onGetStarted }) => {
    return (
        <div className="min-h-screen bg-[#0f172a] overflow-x-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full"></div>

            <nav className="relative z-10 px-6 py-8 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20"><Icon name="activity" className="text-white" /></div>
                    <span className="text-2xl font-bold tracking-tighter text-white">Yomola Global</span>
                </div>
                <div className="hidden md:flex gap-8 text-gray-400 font-medium">
                    <a href="#about" className="hover:text-blue-400 transition">About</a>
                    <a href="#solutions" className="hover:text-blue-400 transition">Solutions</a>
                    <a href="#security" className="hover:text-blue-400 transition">Security</a>
                </div>
                <Button variant="secondary" onClick={onGetStarted} className="border-white/10 glass text-white">Portals</Button>
            </nav>

            <section className="relative z-10 px-6 pt-20 pb-32 flex flex-col items-center text-center max-w-5xl mx-auto">
                <div className="inline-flex py-1 px-3 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest animate-pulse">Secure Wealth Management</div>
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-8">Save Smarter. <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Live Better.</span></h1>
                <p className="text-gray-400 text-xl max-w-2xl mb-12">Yomola Global empowers you to build a secure financial future. Our sophisticated infrastructure simplifies capital growth with elite-level transparency and 3D security.</p>
                <div className="flex flex-col sm:flex-row gap-6">
                    <Button variant="primary" onClick={onGetStarted} className="text-xl px-12 py-5 glow">Get Started Today</Button>
                    <Button variant="secondary" className="text-xl px-12 py-5 border-white/10 glass">Contact Support</Button>
                </div>

                <div className="mt-24 relative w-full max-w-4xl mx-auto perspective-1000">
                    <div className="glass border-white/20 rounded-3xl p-4 shadow-2xl transform rotateX(15deg) transition-transform hover:rotateX(5deg) duration-700">
                        <div className="bg-[#0f172a] rounded-2xl p-8 h-[400px] flex flex-col justify-center items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 to-transparent"></div>
                            <Icon name="shield-check" className="w-48 h-48 text-blue-500/20 mb-8 animate-float" />
                            <div className="text-center">
                                <h4 className="text-2xl font-bold text-white mb-2">Multi-Layer Ledger Security</h4>
                                <p className="text-gray-500">Your assets are protected by enterprise-grade encryption and 3D depth verification protocols.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="about" className="relative z-10 px-6 py-32 max-w-7xl mx-auto border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                    <div>
                        <h2 className="text-5xl font-black text-white mb-8 tracking-tighter">Premier Wealth <br /><span className="text-blue-500">Infrastructure.</span></h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">Yomola Global is more than a savings platform; it is a meticulously engineered financial ecosystem. Our mission is to bridge the gap between traditional savings and modern digital asset management.</p>
                        <p className="text-gray-400 text-lg leading-relaxed">Founded on the principles of transparency and absolute security, we provide the tools for individuals and institutions to grow their capital with confidence.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="border-blue-500/20 p-8 text-center"><h4 className="text-4xl font-black text-white mb-2">100%</h4><p className="text-xs text-gray-500 uppercase font-black">Transparency</p></Card>
                        <Card className="border-emerald-500/20 p-8 text-center"><h4 className="text-4xl font-black text-white mb-2">24/7</h4><p className="text-xs text-gray-500 uppercase font-black">Monitoring</p></Card>
                        <Card className="border-indigo-500/20 p-8 text-center"><h4 className="text-4xl font-black text-white mb-2">3D</h4><p className="text-xs text-gray-500 uppercase font-black">Security</p></Card>
                        <Card className="border-orange-500/20 p-8 text-center"><h4 className="text-4xl font-black text-white mb-2">Elite</h4><p className="text-xs text-gray-500 uppercase font-black">Service</p></Card>
                    </div>
                </div>
            </section>

            <footer className="relative z-10 px-6 py-20 border-t border-white/5 text-center max-w-7xl mx-auto">
                <div className="flex flex-col items-center">
                    <div className="p-3 bg-blue-600 rounded-xl mb-6"><Icon name="activity" className="text-white w-8 h-8" /></div>
                    <h3 className="text-2xl font-bold text-white mb-4 tracking-tighter">Yomola Global</h3>
                    <p className="text-gray-500 text-sm max-w-md">All funds are managed under strict regulatory compliance and protected by advanced cryptographic protocols. © 2026 Yomola Global. Secure Financial Future.</p>
                </div>
            </footer>
        </div>
    );
};

// --- PORTAL CHOICE ---
const PortalChoice = ({ onSelect, onBack }) => {
    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="relative z-10 w-full max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-black text-white mb-6 tracking-tighter">Choose Your Gateway</h2>
                    <p className="text-gray-400 text-lg">Select the appropriate portal to access the Yomola Global ecosystem.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button onClick={() => onSelect('client')} className="glass group p-10 rounded-[2.5rem] text-left hover:bg-white/10 transition-all border-white/5 hover:border-blue-500/50">
                        <div className="p-5 bg-blue-600/10 text-blue-400 rounded-3xl inline-block mb-8 group-hover:scale-110 transition-transform"><Icon name="user" className="w-10 h-10" /></div>
                        <h3 className="text-3xl font-bold text-white mb-3">Client Workspace</h3>
                        <p className="text-gray-400 text-lg">Manage personal savings, track transactions, and download statements in real-time.</p>
                    </button>
                    <button onClick={() => onSelect('admin')} className="glass group p-10 rounded-[2.5rem] text-left hover:bg-white/10 transition-all border-white/5 hover:border-orange-500/50">
                        <div className="p-5 bg-orange-600/10 text-orange-400 rounded-3xl inline-block mb-8 group-hover:scale-110 transition-transform"><Icon name="shield" className="w-10 h-10" /></div>
                        <h3 className="text-3xl font-bold text-white mb-3">Administration</h3>
                        <p className="text-gray-400 text-lg">Central hub for staff to manage clients, record transactions, and generate system reports.</p>
                    </button>
                </div>
                <button onClick={onBack} className="mt-12 w-full text-gray-500 hover:text-white transition flex items-center justify-center gap-2"><Icon name="arrow-left" /> Back to Website</button>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App = () => {
    const { path, fullHash, navigate } = useRouter();
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    // Initial load
    useEffect(() => { setTimeout(() => setReady(true), 800); }, []);

    // Determine Logic View from Hash
    const rootPath = path[0]; // e.g., 'dashboard'

    // Auth portal type from query params or simple sub-hash #auth/client
    const authType = path[0] === 'auth' ? path[1] : null;

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        navigate('dashboard');
    };

    const handleLogout = () => {
        setUser(null);
        navigate(''); // Back to landing
    };

    if (!ready) return <div className="h-screen bg-[#0f172a] flex items-center justify-center"><div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div></div>;

    if (rootPath === 'portal') return <PortalChoice onSelect={(type) => navigate(`auth/${type}`)} onBack={() => navigate('')} />;

    if (rootPath === 'auth') return <AuthScreen forceStep={authType === 'admin' ? 'admin' : 'phone'} onLoginSuccess={handleLoginSuccess} />;

    if (rootPath === 'dashboard' && user) return <Dashboard user={user} onLogout={handleLogout} />;

    return <LandingPage onGetStarted={() => navigate('portal')} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

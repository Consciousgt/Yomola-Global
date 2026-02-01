const { useState, useEffect, useMemo } = React;
const { Card, Button, Input, Icon } = window.UI;

const Dashboard = ({ user, onLogout }) => {
    const [view, setView] = useState('home');
    const [transactions, setTransactions] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ balance: 0, growth: 0 });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            if (user.role === 'admin') {
                const [cls, txs] = await Promise.all([
                    window.CloudStorage.loadClients(),
                    window.CloudStorage.loadTransactions()
                ]);
                setClients(cls);
                setTransactions(txs);
            } else {
                const txs = await window.CloudStorage.loadTransactions(user.id);
                setTransactions(txs);
            }
            setLoading(false);
        };
        fetchData();
    }, [user]);

    const myTransactions = useMemo(() => transactions, [transactions]);
    const balance = user.role === 'admin' ? clients.reduce((s, c) => s + (c.balance || 0), 0) : user.balance;

    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 glass border-r border-white/10 p-6 flex flex-col gap-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/40">
                        <Icon name="activity" className="text-white w-6 h-6" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Yomola</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <button onClick={() => setView('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'home' ? 'bg-blue-600 text-white shadow-xl translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <Icon name="layout-dashboard" /> Dashboard
                    </button>
                    {user.role === 'admin' && (
                        <>
                            <button onClick={() => setView('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'clients' ? 'bg-blue-600 text-white shadow-xl translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <Icon name="users" /> Clients
                            </button>
                            <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-xl translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <Icon name="list" /> All Logs
                            </button>
                        </>
                    )}
                </nav>

                <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 transition-colors">
                        <Icon name="log-out" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] -z-10 rounded-full"></div>

                <header className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight mb-2">
                            {view === 'home' ? 'Overview' : view.charAt(0).toUpperCase() + view.slice(1)}
                        </h2>
                        <p className="text-gray-500">Welcome to your sophisticated wealth management hub.</p>
                    </div>
                </header>

                {view === 'home' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card className="lg:col-span-2 bg-gradient-to-br from-blue-900/40 to-indigo-900/20 border-blue-500/20 relative overflow-hidden">
                                <Icon name="wallet" className="absolute -bottom-10 -right-10 w-64 h-64 text-blue-500/5 rotate-12" />
                                <p className="text-sm font-medium text-blue-400 uppercase tracking-widest mb-2">Total {user.role === 'admin' ? 'Managed Funds' : 'Personal Savings'}</p>
                                <h3 className="text-6xl font-black tracking-tighter mb-8">{window.formatMoney(balance)}</h3>
                                <div className="flex gap-4">
                                    <Button variant="primary" className="glow shadow-blue-500/20">Quick Transaction</Button>
                                    <Button variant="secondary">Financial Reports</Button>
                                </div>
                            </Card>

                            <Card className="flex flex-col justify-between">
                                <div>
                                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl inline-block mb-4">
                                        <Icon name="trending-up" className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-xl font-bold">Safe & Secure</h4>
                                    <p className="text-sm text-gray-400 mt-2">Your funds are protected with industry-leading encryption and 3D security layers.</p>
                                </div>
                                <div className="pt-6 border-t border-white/5 mt-6">
                                    <p className="text-xs text-gray-500">System Status: <span className="text-emerald-500 font-bold">Operational</span></p>
                                </div>
                            </Card>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold">Recent Activity</h3>
                                <button className="text-blue-400 text-sm hover:underline">View full history</button>
                            </div>
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="text-center py-20 text-gray-600 animate-pulse">Synchronizing ledger...</div>
                                ) : myTransactions.length > 0 ? (
                                    myTransactions.slice(0, 10).map(t => (
                                        <div key={t.id} className="glass p-4 rounded-xl flex items-center justify-between border-white/5 hover:border-white/20 transition-all hover:translate-x-1">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-lg ${t.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    <Icon name={t.type === 'DEPOSIT' ? 'arrow-down-left' : 'arrow-up-right'} />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{t.type === 'DEPOSIT' ? 'Deposit Received' : 'Withdrawal Executed'}</p>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wide">{window.formatDate(t.date)} • {t.method}</p>
                                                </div>
                                            </div>
                                            <p className={`text-lg font-bold ${t.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {t.type === 'DEPOSIT' ? '+' : '-'}{window.formatMoney(t.amount)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="glass p-12 rounded-2xl text-center text-gray-500 border-dashed border-white/10">
                                        No recent transactions found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Simple artificial delay for 3D feel on load
        setTimeout(() => setReady(true), 800);
    }, []);

    if (!ready) return (
        <div className="h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-50"></div>
                </div>
            </div>
        </div>
    );

    return user ? (
        <Dashboard user={user} onLogout={() => setUser(null)} />
    ) : (
        <window.AuthScreen onLoginSuccess={setUser} />
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

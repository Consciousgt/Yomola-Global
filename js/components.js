const { useEffect } = React;

// --- SHARED UI COMPONENTS ---

const Icon = ({ name, className = "w-5 h-5" }) => {
    useEffect(() => { if (window.lucide) window.lucide.createIcons(); }, [name]);
    return <i data-lucide={name} className={className}></i>;
};

const Card = ({ children, className = "" }) => (
    <div className={`glass glass-card p-6 rounded-2xl ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon }) => {
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40",
        secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
        danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40",
        success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40",
    };
    return (
        <button disabled={disabled} onClick={onClick} className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}>
            {icon && <Icon name={icon} />}
            {children}
        </button>
    );
};

const Input = ({ label, type = "text", value, onChange, placeholder, maxLength, icon, name, required = false, defaultValue }) => (
    <div className="space-y-2">
        {label && <label className="block text-sm font-medium text-gray-400">{label}</label>}
        <div className="relative">
            {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Icon name={icon} /></div>}
            <input defaultValue={defaultValue} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} required={required}
                className={`w-full bg-gray-800/50 border border-white/10 rounded-xl py-3 ${icon ? 'pl-12' : 'pl-4'} pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-600 transition-all`}
            />
        </div>
    </div>
);

const ActivityList = ({ loading, transactions, isAdminView }) => {
    return (
        <div className="space-y-4">
            {loading ? (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Synchronizing Ledger...</p>
                </div>
            ) : transactions.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {transactions.slice(0, 10).map(t => (
                        <div key={t.id} className="glass group p-5 rounded-2xl flex items-center justify-between border-white/5 hover:bg-white/5 transition-all duration-300">
                            <div className="flex items-center gap-6">
                                <div className={`p-4 rounded-2xl shadow-inner ${t.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <Icon name={t.type === 'DEPOSIT' ? 'plus' : 'minus'} className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-lg text-white">{t.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}</p>
                                        {isAdminView && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500">ID: {t.clientId.slice(-4)}</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
                                        {window.formatDate(t.date)} • {t.method} {t.recordedBy ? `• ${t.recordedBy}` : ''}
                                    </p>
                                </div>
                            </div>
                            <p className={`text-2xl font-black ${t.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {t.type === 'DEPOSIT' ? '+' : '-'}{window.formatMoney(t.amount)}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass p-20 text-center text-gray-500 rounded-3xl border-dashed border-white/5">
                    <Icon name="folder-open" className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No activity recorded for this period.</p>
                </div>
            )}
        </div>
    );
};

const TransactionTable = ({ transactions, clients }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 text-gray-500 uppercase text-[10px] font-black tracking-[0.2em]">
                    <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Recorded By</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-400">{window.formatDate(t.date)}</td>
                            <td className="px-6 py-4 font-bold text-white">{clients.find(c => c.id === t.clientId)?.name || 'Unknown'}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${t.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {t.type}
                                </span>
                            </td>
                            <td className={`px-6 py-4 font-black ${t.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-red-400'}`}>{window.formatMoney(t.amount)}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{t.recordedBy || 'System'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

window.UI = { Icon, Card, Button, Input, ActivityList, TransactionTable };

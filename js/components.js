const { useState, useEffect, useMemo } = React;

const Icon = ({ name, className = "w-5 h-5" }) => {
    useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [name]);
    return <i data-lucide={name} className={className}></i>;
};

const Card = ({ children, className = "" }) => (
    <div className={`glass glass-card p-6 rounded-2xl ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false }) => {
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20",
        secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
        danger: "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20",
        success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20",
    };

    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

const Input = ({ label, type = "text", value, onChange, placeholder, maxLength, icon }) => (
    <div className="space-y-2">
        {label && <label className="block text-sm font-medium text-gray-400">{label}</label>}
        <div className="relative">
            {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Icon name={icon} className="w-5 h-5" /></div>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
                className={`w-full bg-gray-800/50 border border-white/10 rounded-xl py-3 ${icon ? 'pl-12' : 'pl-4'} pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-600 transition-all`}
            />
        </div>
    </div>
);

window.UI = { Icon, Card, Button, Input };

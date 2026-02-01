const { useState } = React;
const { Card, Button, Input, Icon } = window.UI;

const AuthScreen = ({ onLoginSuccess }) => {
    const [step, setStep] = useState('phone'); // phone, create, login, admin
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userContext, setUserContext] = useState(null);

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (phone.length < 10) return setError("Enter a valid phone number");

        setLoading(true);
        const client = await window.CloudStorage.getClientByPhone(phone);
        setLoading(false);

        if (client) {
            setUserContext(client);
            if (client.passwordCreated) {
                setStep('login');
            } else {
                setStep('create');
            }
        } else {
            // Check if it's admin login attempt via a special keyword or just show not found
            if (phone === '0000000000') {
                setStep('admin');
            } else {
                setError("Account not found. Please contact Yomola Global Admin.");
            }
        }
    };

    const handleCreatePassword = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length !== 4) return setError("Password must be exactly 4 characters");
        if (password !== confirmPassword) return setError("Passwords do not match");
        if (!email.includes('@')) return setError("Valid email required for recovery");

        setLoading(true);
        try {
            await window.CloudStorage.updateClientPassword(userContext.id, password, email);
            onLoginSuccess({ ...userContext, role: 'client', password, email });
        } catch (e) {
            setError("Failed to create password");
        }
        setLoading(false);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === userContext.password) {
            onLoginSuccess({ ...userContext, role: 'client' });
        } else {
            setError("Incorrect password/PIN");
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        const settings = await window.CloudStorage.loadSettings();
        if (!settings.adminPin || adminKey === settings.adminPin) {
            onLoginSuccess({ name: 'System Admin', role: 'admin' });
        } else {
            setError("Invalid Administrative Key");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 auth-container">
            <div className="auth-form w-full max-w-md">
                <Card className="shadow-2xl border-white/20">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-4 rounded-2xl bg-blue-500/20 text-blue-400 mb-4 animate-float">
                            <Icon name="shield-check" className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Yomola Global</h1>
                        <p className="text-gray-400 mt-2">Secure Wealth Portal</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                            <Icon name="alert-circle" className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {step === 'phone' && (
                        <form onSubmit={handlePhoneSubmit} className="space-y-6">
                            <Input
                                label="Phone Number"
                                icon="phone"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                placeholder="080..."
                                maxLength={11}
                            />
                            <Button className="w-full" disabled={loading}>
                                {loading ? 'Verifying...' : 'Continue'}
                            </Button>
                        </form>
                    )}

                    {step === 'create' && (
                        <form onSubmit={handleCreatePassword} className="space-y-4">
                            <p className="text-sm text-blue-400 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                This is your first login. Please create a secure 4-digit PIN.
                            </p>
                            <Input
                                type="password"
                                label="Create 4-Digit PIN"
                                icon="lock"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                maxLength={4}
                            />
                            <Input
                                type="password"
                                label="Confirm PIN"
                                icon="check-circle"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                maxLength={4}
                            />
                            <Input
                                type="email"
                                label="Recovery Email"
                                icon="mail"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                            />
                            <Button className="w-full" variant="success">Initialize Account</Button>
                            <button onClick={() => setStep('phone')} className="w-full text-sm text-gray-500 hover:text-gray-300 transition">Back</button>
                        </form>
                    )}

                    {step === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <p className="text-gray-300">Welcome back, <span className="text-white font-bold">{userContext.name}</span></p>
                            <Input
                                type="password"
                                label="Enter PIN"
                                icon="key"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                maxLength={4}
                            />
                            <Button className="w-full">Unlock Dashboard</Button>
                            <button onClick={() => setStep('phone')} className="w-full text-sm text-gray-500 hover:text-gray-300 transition text-center mt-4">Login with different number</button>
                        </form>
                    )}

                    {step === 'admin' && (
                        <form onSubmit={handleAdminLogin} className="space-y-6">
                            <h2 className="text-xl font-bold text-orange-400">Administrative Access</h2>
                            <Input
                                type="password"
                                label="Admin Key"
                                icon="shield"
                                value={adminKey}
                                onChange={e => setAdminKey(e.target.value)}
                            />
                            <Button className="w-full" variant="danger">Access Terminal</Button>
                            <button onClick={() => setStep('phone')} className="w-full text-sm text-gray-400">Back</button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

window.AuthScreen = AuthScreen;

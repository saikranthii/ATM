let userId = null;
let userName = null;
let userEmail = null;
let token = localStorage.getItem('adminToken');
let adminProfile = null;
let currentOperation = null;
let operationData = null;

document.addEventListener('DOMContentLoaded', () => {
    const showSignIn = document.getElementById('show-signin');
    const showSignUp = document.getElementById('show-signup');
    const signInForm = document.getElementById('signin-form');
    const signUpForm = document.getElementById('signup-form');

    if (showSignIn && showSignUp) {
        showSignIn.addEventListener('click', () => {
            signInForm.classList.remove('hidden');
            signUpForm.classList.add('hidden');
            showSignIn.classList.add('active');
            showSignIn.classList.remove('inactive');
            showSignUp.classList.add('inactive');
            showSignUp.classList.remove('active');
        });

        showSignUp.addEventListener('click', () => {
            signUpForm.classList.remove('hidden');
            signInForm.classList.add('hidden');
            showSignUp.classList.add('active');
            showSignUp.classList.remove('inactive');
            showSignIn.classList.add('inactive');
            showSignIn.classList.remove('active');
        });
    }

    if (window.location.pathname.includes('admin-dashboard.html') && !token) {
        window.location.href = 'admin-login.html';
    } else if (window.location.pathname.includes('admin-dashboard.html')) {
        fetchAdminProfile();
        fetchUsers();
    }
});

function showCardModal() {
    const modal = document.getElementById('card-modal');
    modal.classList.remove('hidden');
    document.getElementById('card-message').textContent = '';
    document.getElementById('card_number').value = '';
}

function hideCardModal() {
    const modal = document.getElementById('card-modal');
    modal.classList.add('hidden');
    document.getElementById('card-message').textContent = '';
}

function showPinModal() {
    const modal = document.getElementById('pin-modal');
    modal.classList.remove('hidden');
    document.getElementById('pin-message').textContent = '';
    document.getElementById('pin').value = '';
}

function hidePinModal() {
    const modal = document.getElementById('pin-modal');
    modal.classList.add('hidden');
    document.getElementById('pin-message').textContent = '';
}

function selectOperation(operation) {
    currentOperation = operation;
    showOperation(operation);
}

function showOperation(operation) {
    const resultContainer = document.getElementById('operation-result');
    resultContainer.classList.remove('hidden');

    const operations = {
        balance: `
            <h2>Balance Inquiry</h2>
            <button onclick="showPinModal()" class="btn btn-primary">Check Balance</button>
            <p id="balance-result" class="mt-4"></p>
            <p id="operation-message" class="mt-4 error-message"></p>
        `,
        withdraw: `
            <h2>Cash Withdrawal</h2>
            <form onsubmit="storeOperationData(event, 'withdraw')">
                <div class="form-group">
                    <label for="withdraw-amount">Amount</label>
                    <input type="number" id="withdraw-amount" min="100" step="100" required>
                </div>
                <button type="submit" class="btn btn-primary">Withdraw</button>
            </form>
            <p id="operation-message" class="mt-4 error-message"></p>
        `,
        deposit: `
            <h2>Cash Deposit</h2>
            <form onsubmit="storeOperationData(event, 'deposit')">
                <div class="form-group">
                    <label for="deposit-amount">Amount</label>
                    <input type="number" id="deposit-amount" min="100" step="100" required>
                </div>
                <button type="submit" class="btn btn-primary">Deposit</button>
            </form>
            <p id="operation-message" class="mt-4 error-message"></p>
        `,
        statement: `
            <h2>Mini Statement</h2>
            <button onclick="showPinModal()" class="btn btn-primary">View Statement</button>
            <table id="mini-statement-table" class="data-table mt-4">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Recipient</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <p id="operation-message" class="mt-4 error-message"></p>
        `,
        transfer: `
            <h2>Fund Transfer</h2>
            <form onsubmit="storeOperationData(event, 'transfer')">
                <div class="form-group">
                    <label for="recipient-account">Recipient Account Number</label>
                    <input type="text" id="recipient-account" class="account-number" required>
                </div>
                <div class="form-group">
                    <label for="transfer-amount">Amount</label>
                    <input type="number" id="transfer-amount" min="100" step="100" required>
                </div>
                <button type="submit" class="btn btn-primary">Transfer</button>
            </form>
            <p id="operation-message" class="mt-4 error-message"></p>
        `,
        'pin-change': `
            <h2>PIN Change</h2>
            <form onsubmit="storeOperationData(event, 'pin-change')">
                <div class="form-group">
                    <label for="account-number">Account Number</label>
                    <input type="text" id="account-number" class="account-number" required>
                </div>
                <div class="form-group">
                    <label for="current-pin">Current PIN</label>
                    <input type="password" id="current-pin" required>
                </div>
                <div class="form-group">
                    <label for="new-pin">New PIN</label>
                    <input type="password" id="new-pin" required>
                </div>
                <div class="form-group">
                    <label for="confirm-new-pin">Confirm New PIN</label>
                    <input type="password" id="confirm-new-pin" required>
                </div>
                <button type="submit" class="btn btn-primary">Change PIN</button>
            </form>
            <p id="operation-message" class="mt-4 error-message"></p>
        `,
        'upi-transfer': `
            <h2>UPI Transfer</h2>
            <form onsubmit="storeOperationData(event, 'upi-transfer')">
                <div class="form-group">
                    <label for="upi-amount">Amount</label>
                    <input type="number" id="upi-amount" min="1" required>
                </div>
                <button type="submit" class="btn btn-primary">Generate QR Code</button>
            </form>
            <div id="qrcode" class="mt-4"></div>
            <button id="confirm-payment" class="btn btn-primary mt-4 hidden" onclick="confirmUpiPayment()">Confirm Payment (Simulated)</button>
            <p id="operation-message" class="mt-4 error-message"></p>
        `
    };

    resultContainer.innerHTML = operations[operation] || '<p>Invalid operation</p><p id="operation-message" class="mt-4 error-message"></p>';
    attachInputFormatters();
}

function storeOperationData(event, operation) {
    event.preventDefault();
    operationData = {};
    if (operation === 'withdraw') {
        operationData.amount = parseFloat(document.getElementById('withdraw-amount').value);
    } else if (operation === 'deposit') {
        operationData.amount = parseFloat(document.getElementById('deposit-amount').value);
    } else if (operation === 'transfer') {
        operationData.recipient_account = document.getElementById('recipient-account').value.replace(/\s/g, '');
        operationData.amount = parseFloat(document.getElementById('transfer-amount').value);
        if (operationData.recipient_account.length !== 12) {
            document.getElementById('operation-message').textContent = 'Recipient account number must be 12 digits (e.g., 1234 5678 9012)';
            return;
        }
    } else if (operation === 'pin-change') {
        operationData.account_number = document.getElementById('account-number').value.replace(/\s/g, '');
        operationData.current_pin = document.getElementById('current-pin').value;
        operationData.new_pin = document.getElementById('new-pin').value;
        operationData.confirm_new_pin = document.getElementById('confirm-new-pin').value;
        if (operationData.new_pin !== operationData.confirm_new_pin) {
            document.getElementById('operation-message').textContent = 'New PIN and Confirm PIN must match';
            return;
        }
        if (operationData.account_number.length !== 12) {
            document.getElementById('operation-message').textContent = 'Account number must be 12 digits (e.g., 1234 5678 9012)';
            return;
        }
    } else if (operation === 'upi-transfer') {
        operationData.amount = parseFloat(document.getElementById('upi-amount').value);
    }
    showPinModal();
}

async function executeOperation() {
    const resultContainer = document.getElementById('operation-result');
    const messageElement = document.getElementById('operation-message');

    messageElement.textContent = '';

    try {
        if (currentOperation === 'balance') {
            const response = await fetch(`http://localhost:3001/api/atm/balance/${userId}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('balance-result').textContent = `Current Balance: ₹${data.balance}`;
                messageElement.textContent = 'Balance inquiry completed successfully!';
            } else {
                messageElement.textContent = data.message || 'Error fetching balance';
            }
        } else if (currentOperation === 'withdraw') {
            if (operationData.amount < 100 || operationData.amount % 100 !== 0) {
                messageElement.textContent = 'Amount must be at least ₹100 and in multiples of 100';
                return;
            }
            const response = await fetch(`http://localhost:3001/api/atm/withdraw/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: operationData.amount })
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('withdraw-amount').value = '';
                messageElement.textContent = `Withdrawal of ₹${operationData.amount} successful!`;
            } else {
                messageElement.textContent = data.message || 'Error processing withdrawal';
            }
        } else if (currentOperation === 'deposit') {
            if (operationData.amount < 100 || operationData.amount % 100 !== 0) {
                messageElement.textContent = 'Amount must be at least ₹100 and in multiples of 100';
                return;
            }
            const response = await fetch(`http://localhost:3001/api/atm/deposit/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: operationData.amount })
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('deposit-amount').value = '';
                messageElement.textContent = `Deposit of ₹${operationData.amount} successful!`;
            } else {
                messageElement.textContent = data.message || 'Error processing deposit';
            }
        } else if (currentOperation === 'statement') {
            const response = await fetch(`http://localhost:3001/api/atm/statement/${userId}`);
            const data = await response.json();
            if (response.ok) {
                const tbody = document.querySelector('#mini-statement-table tbody');
                tbody.innerHTML = '';
                if (data.length === 0) {
                    messageElement.textContent = 'No transactions found';
                } else {
                    data.forEach(t => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${new Date(t.transaction_date).toLocaleString()}</td>
                            <td>${t.type}</td>
                            <td>₹${t.amount}</td>
                            <td>${t.recipient_account || '-'}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                    messageElement.textContent = 'Mini statement retrieved successfully!';
                }
            } else {
                messageElement.textContent = data.message || 'Error fetching statement';
            }
        } else if (currentOperation === 'transfer') {
            if (operationData.recipient_account.length !== 12) {
                messageElement.textContent = 'Recipient account number must be 12 digits (e.g., 1234 5678 9012)';
                return;
            }
            if (operationData.amount < 100) {
                messageElement.textContent = 'Amount must be at least ₹100';
                return;
            }
            const response = await fetch(`http://localhost:3001/api/atm/transfer/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient_account: operationData.recipient_account, amount: operationData.amount })
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('recipient-account').value = '';
                document.getElementById('transfer-amount').value = '';
                messageElement.textContent = `Transfer of ₹${operationData.amount} to account ${operationData.recipient_account} successful!`;
            } else {
                messageElement.textContent = data.message || 'Error processing transfer';
            }
        } else if (currentOperation === 'pin-change') {
            if (operationData.new_pin.length !== 4) {
                messageElement.textContent = 'New PIN must be 4 digits';
                return;
            }
            const response = await fetch(`http://localhost:3001/api/atm/pin-change/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_number: operationData.account_number,
                    current_pin: operationData.current_pin,
                    new_pin: operationData.new_pin
                })
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('account-number').value = '';
                document.getElementById('current-pin').value = '';
                document.getElementById('new-pin').value = '';
                document.getElementById('confirm-new-pin').value = '';
                messageElement.textContent = 'PIN changed successfully!';
            } else {
                messageElement.textContent = data.message || 'Error changing PIN';
            }
        } else if (currentOperation === 'upi-transfer') {
            if (operationData.amount < 1) {
                messageElement.textContent = 'Amount must be at least ₹1';
                return;
            }
            const upiId = 'sampleatm@oksbi';// replace with ATM UPI id
            const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=ATM&am=${operationData.amount}&cu=INR`;
            const qrCodeDiv = document.getElementById('qrcode');
            qrCodeDiv.innerHTML = '';
            new QRCode(qrCodeDiv, {
                text: upiLink,
                width: 200,
                height: 200
            });
            document.getElementById('confirm-payment').classList.remove('hidden');
            messageElement.textContent = 'Scan the QR code with a UPI app to pay.';
        }
    } catch (err) {
        console.error(`${currentOperation} error:`, err);
        messageElement.textContent = `Error processing ${currentOperation.replace('-', ' ')}: Unable to connect to backend`;
    }
}

async function confirmUpiPayment() {
    const messageElement = document.getElementById('operation-message');
    try {
        const response = await fetch(`http://localhost:3001/api/atm/upi-transfer/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: operationData.amount, upi_id: 'sampleatm@oksbi' })//replace with ATM UPI id
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('upi-amount').value = '';
            document.getElementById('qrcode').innerHTML = '';
            document.getElementById('confirm-payment').classList.add('hidden');
            messageElement.textContent = `UPI transfer of ₹${operationData.amount} successful!`;
        } else {
            messageElement.textContent = data.message || 'Error processing UPI transfer';
        }
    } catch (err) {
        console.error('UPI payment error:', err);
        messageElement.textContent = 'Error processing UPI transfer: Unable to connect to backend';
    }
}

async function validateCard(event) {
    event.preventDefault();
    const card_number = document.getElementById('card_number').value.replace(/\s/g, '');
    const message = document.getElementById('card-message');

    console.log('Starting card validation:', { card_number });

    if (card_number.length !== 16) {
        message.textContent = 'Invalid card number, must be 16 digits (e.g., 1234 5678 9012 3456)';
        console.log('Validation failed: Incorrect card number length', { card_number_length: card_number.length });
        return;
    }

    try {
        console.log('Sending request to /api/atm/validate-card');
        const response = await fetch('http://localhost:3001/api/atm/validate-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_number })
        });
        const data = await response.json();
        console.log('Validation response:', { status: response.status, data });

        if (response.ok) {
            userId = data.userId;
            userName = data.name;
            userEmail = data.email;
            localStorage.setItem('atmUserId', userId);
            console.log('Card validation successful:', { userId, userName });
            hideCardModal();
            document.getElementById('welcome-message').textContent = `Welcome, ${userName}`;
            document.getElementById('welcome-message').classList.remove('hidden');
            document.getElementById('operations-container').classList.remove('hidden');
        } else {
            message.textContent = data.message || `Card validation failed (Status: ${response.status})`;
            console.log('Card validation failed:', { message: data.message, status: response.status });
        }
    } catch (err) {
        console.error('Card validation error:', err);
        message.textContent = 'Server error: Unable to connect to backend';
        console.log('Card validation fetch error:', { error: err.message });
    }
}

async function validatePin(event) {
    event.preventDefault();
    const pin = document.getElementById('pin').value;
    const message = document.getElementById('pin-message');

    console.log('Starting PIN validation:', { userId, operation: currentOperation });

    if (pin.length !== 4) {
        message.textContent = 'Invalid PIN (4 digits)';
        console.log('PIN validation failed: Incorrect PIN length', { pin_length: pin.length });
        return;
    }

    try {
        console.log('Sending request to /api/atm/validate-pin');
        const response = await fetch('http://localhost:3001/api/atm/validate-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, pin })
        });
        const data = await response.json();
        console.log('PIN validation response:', { status: response.status, data });

        if (response.ok) {
            hidePinModal();
            await executeOperation();
        } else {
            message.textContent = data.message || `PIN validation failed (Status: ${response.status})`;
            console.log('PIN validation failed:', { message: data.message, status: response.status });
        }
    } catch (err) {
        console.error('PIN validation error:', err);
        message.textContent = 'Server error: Unable to connect to backend';
        console.log('PIN validation fetch error:', { error: err.message });
    }
}

async function adminLogin(event) {
    event.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const message = document.getElementById('signin-message');

    try {
        const response = await fetch('http://localhost:3001/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            token = data.token;
            localStorage.setItem('adminToken', token);
            window.location.href = 'admin-dashboard.html';
        } else {
            message.textContent = data.message || `Login failed (Status: ${response.status})`;
        }
    } catch (err) {
        console.error('Login error:', err);
        message.textContent = 'Server error: Unable to connect to backend';
    }
}

async function adminSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const bank_id = document.getElementById('signup-bank-id').value;
    const location = document.getElementById('signup-location').value;
    const password = document.getElementById('signup-password').value;
    const message = document.getElementById('signup-message');

    if (!email.includes('@')) {
        message.textContent = 'Invalid email format';
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/admin/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, bank_id, location, password })
        });
        const data = await response.json();
        message.textContent = data.message;
        if (response.ok) {
            document.getElementById('show-signin').click();
            document.getElementById('signin-email').value = email;
        }
    } catch (err) {
        console.error('Signup error:', err);
        message.textContent = 'Server error: Unable to connect to backend';
    }
}

async function fetchAdminProfile() {
    const message = document.getElementById('message');
    if (!token) {
        message.textContent = 'Please log in again';
        setTimeout(() => window.location.href = 'admin-login.html', 2000);
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/admin/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (response.ok) {
            adminProfile = data;
            const profileBtn = document.getElementById('profile-btn');
            profileBtn.textContent = adminProfile.email.slice(0, 2).toUpperCase();
            document.getElementById('profile-name').value = adminProfile.name;
            document.getElementById('profile-email').value = adminProfile.email;
            document.getElementById('profile-bank-id').value = adminProfile.bank_id;
            document.getElementById('profile-location').value = adminProfile.location;
        } else {
            message.textContent = data.message || 'Failed to fetch profile';
            if (response.status === 401) {
                localStorage.removeItem('adminToken');
                setTimeout(() => window.location.href = 'admin-login.html', 2000);
            }
        }
    } catch (err) {
        console.error('Fetch profile error:', err);
        message.textContent = 'Error fetching profile';
    }
}

async function updateAdminProfile(event) {
    event.preventDefault();
    const profile = {
        name: document.getElementById('profile-name').value,
        email: document.getElementById('profile-email').value,
        bank_id: document.getElementById('profile-bank-id').value,
        location: document.getElementById('profile-location').value,
        password: document.getElementById('profile-password').value || undefined
    };
    const message = document.getElementById('message');

    if (!profile.email.includes('@')) {
        message.textContent = 'Invalid email format';
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/admin/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profile)
        });
        const data = await response.json();
        message.textContent = data.message;
        if (response.ok) {
            adminProfile = { ...adminProfile, ...profile };
            document.getElementById('profile-btn').textContent = profile.email.slice(0, 2).toUpperCase();
            document.getElementById('profile-password').value = '';
            toggleProfileDropdown();
        } else if (response.status === 401) {
            message.textContent = 'Session expired. Please log in again.';
            localStorage.removeItem('adminToken');
            setTimeout(() => window.location.href = 'admin-login.html', 2000);
        }
    } catch (err) {
        console.error('Update profile error:', err);
        message.textContent = 'Error updating profile';
    }
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('hidden');
}

async function fetchUsers() {
    const message = document.getElementById('message');
    if (!token) {
        message.textContent = 'Please log in again';
        setTimeout(() => window.location.href = 'admin-login.html', 2000);
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const users = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                message.textContent = 'Session expired. Please log in again.';
                localStorage.removeItem('adminToken');
                setTimeout(() => window.location.href = 'admin-login.html', 2000);
                return;
            }
            throw new Error(users.message || 'Failed to fetch users');
        }
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td><input type="text" value="${user.name}" id="name-${user.id}"></td>
                <td><input type="text" value="${user.phone}" id="phone-${user.id}"></td>
                <td><input type="email" value="${user.email}" id="email-${user.id}"></td>
                <td><input type="text" value="${user.card_number}" id="card-${user.id}" class="card-number"></td>
                <td><input type="text" value="${user.pin}" id="pin-${user.id}"></td>
                <td><input type="text" value="${user.account_number}" id="account-${user.id}" class="account-number"></td>
                <td><input type="number" value="${user.balance}" id="balance-${user.id}"></td>
                <td><input type="text" value="${user.bank_name}" id="bank-${user.id}"></td>
                <td><input type="text" value="${user.branch}" id="branch-${user.id}"></td>
                <td class="table-actions">
                    <button onclick="updateUser(${user.id})" class="btn btn-primary">Update</button>
                    <button onclick="deleteUser(${user.id})" class="btn btn-danger">Delete</button>
                    <button onclick="viewTransactions(${user.id})" class="btn btn-secondary">Transactions</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        attachInputFormatters();
    } catch (err) {
        console.error('Fetch users error:', err);
        message.textContent = 'Error fetching users: ' + err.message;
    }
}

async function createUser(event) {
    event.preventDefault();

    // Capture raw input values
    const rawInputs = {
        name: document.getElementById('name')?.value,
        phone: document.getElementById('phone')?.value,
        email: document.getElementById('email')?.value,
        card_number: document.getElementById('card_number')?.value,
        pin: document.getElementById('pin')?.value,
        account_number: document.getElementById('account_number')?.value,
        bank_name: document.getElementById('bank_name')?.value,
        branch: document.getElementById('branch')?.value,
        balance: document.getElementById('balance')?.value
    };

    // Log raw inputs for debugging
    console.log('Raw inputs before processing:', rawInputs);

    // Check if any input field is missing
    if (Object.values(rawInputs).some(input => input === undefined || input === null)) {
        const message = document.getElementById('message');
        message.textContent = 'Error: One or more input fields are missing in the form';
        return;
    }

    // Trim whitespace from all inputs and process card_number and account_number
    const user = {
        name: rawInputs.name.trim(),
        phone: rawInputs.phone.trim(),
        email: rawInputs.email.trim(),
        card_number: rawInputs.card_number.replace(/\s+/g, ''),
        pin: rawInputs.pin.trim(),
        account_number: rawInputs.account_number.replace(/\s+/g, ''),
        bank_name: rawInputs.bank_name.trim(),
        branch: rawInputs.branch.trim(),
        balance: parseFloat(rawInputs.balance)
    };

    // Log processed inputs for debugging
    console.log('Processed inputs:', user);

    const message = document.getElementById('message');

    // Validate numeric fields
    if (!/^\d+$/.test(user.card_number) || !/^\d+$/.test(user.account_number) || !/^\d+$/.test(user.pin) || !/^\d+$/.test(user.phone)) {
        message.textContent = 'Invalid input: Card number, account number, PIN, and phone must be numeric digits only';
        return;
    }

    // Validate lengths and email
    if (user.card_number.length !== 16 || user.account_number.length !== 12 || user.pin.length !== 4 || user.phone.length !== 10 || !user.email.includes('@')) {
        message.textContent = 'Invalid input: Card number must be 16 digits (e.g., 1234 5678 9012 3456), account number must be 12 digits (e.g., 1234 5678 9012), PIN must be 4 digits, phone must be 10 digits, and email must include @';
        return;
    }

    // Validate balance
    if (isNaN(user.balance) || user.balance < 0) {
        message.textContent = 'Invalid input: Balance must be a valid non-negative number';
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(user)
        });
        const data = await response.json();
        if (response.ok) {
            message.textContent = 'User created successfully';
            fetchUsers();
            document.querySelector('form').reset();
            // Ensure inputs are cleared
            document.getElementById('name').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('email').value = '';
            document.getElementById('card_number').value = '';
            document.getElementById('pin').value = '';
            document.getElementById('account_number').value = '';
            document.getElementById('bank_name').value = '';
            document.getElementById('branch').value = '';
            document.getElementById('balance').value = '';
        } else {
            message.textContent = data.error || `Error creating user (Status: ${response.status})`;
            console.log('Backend error:', data);
            if (response.status === 401) {
                message.textContent = 'Session expired. Please log in again.';
                localStorage.removeItem('adminToken');
                setTimeout(() => window.location.href = 'admin-login.html', 2000);
            }
        }
    } catch (err) {
        console.error('Create user error:', err);
        message.textContent = 'Error creating user: Unable to connect to backend';
    }
}

async function updateUser(id) {
    const user = {
        name: document.getElementById(`name-${id}`).value,
        phone: document.getElementById(`phone-${id}`).value,
        email: document.getElementById(`email-${id}`).value,
        card_number: document.getElementById(`card-${id}`).value.replace(/\s/g, ''),
        pin: document.getElementById(`pin-${id}`).value,
        account_number: document.getElementById(`account-${id}`).value.replace(/\s/g, ''),
        balance: parseFloat(document.getElementById(`balance-${id}`).value),
        bank_name: document.getElementById(`bank-${id}`).value,
        branch: document.getElementById(`branch-${id}`).value
    };
    const message = document.getElementById('message');

    // Log inputs for debugging
    console.log('Updating user with inputs:', user);

    // Validate numeric fields
    if (!/^\d+$/.test(user.card_number) || !/^\d+$/.test(user.account_number) || !/^\d+$/.test(user.pin) || !/^\d+$/.test(user.phone)) {
        message.textContent = 'Invalid input: Card number, account number, PIN, and phone must be numeric digits only';
        return;
    }

    if (user.card_number.length !== 16 || user.account_number.length !== 12 || user.pin.length !== 4 || user.phone.length !== 10 || !user.email.includes('@')) {
        message.textContent = 'Invalid input: Card number must be 16 digits (e.g., 1234 5678 9012 3456), account number must be 12 digits (e.g., 1234 5678 9012), PIN must be 4 digits, phone must be 10 digits, and email must include @';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/admin/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(user)
        });
        const data = await response.json();
        message.textContent = data.message;
        if (response.ok) {
            fetchUsers();
        } else if (response.status === 401) {
            message.textContent = 'Session expired. Please log in again.';
            localStorage.removeItem('adminToken');
            setTimeout(() => window.location.href = 'admin-login.html', 2000);
        }
    } catch (err) {
        console.error('Update user error:', err);
        message.textContent = 'Error updating user';
    }
}

async function deleteUser(id) {
    const message = document.getElementById('message');
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`http://localhost:3001/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        message.textContent = data.message;
        if (response.ok) {
            fetchUsers();
        } else if (response.status === 401) {
            message.textContent = 'Session expired. Please log in again.';
            localStorage.removeItem('adminToken');
            setTimeout(() => window.location.href = 'admin-login.html', 2000);
        }
    } catch (err) {
        console.error('Delete user error:', err);
        message.textContent = 'Error deleting user';
    }
}

function viewTransactions(id) {
    console.log('Viewing transactions for userId:', id);
    userId = id;
    localStorage.setItem('transactionUserId', id); // Persist userId in localStorage
    window.location.href = 'transactions.html';
}

async function fetchStatement() {
    const message = document.getElementById('message') || document.createElement('p');
    message.id = 'message';

    // Retrieve userId from localStorage
    userId = localStorage.getItem('transactionUserId');
    console.log('Fetching statement for userId:', userId);

    if (!userId) {
        message.textContent = 'Error: User ID not set. Please return to the dashboard and try again.';
        message.style.color = 'red';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/atm/statement/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Add token for authentication
            }
        });
        console.log('Fetch statement response status:', response.status);
        const transactions = await response.json();
        console.log('Fetched transactions:', transactions);

        const tbody = document.querySelector('#statement-table tbody');
        if (!tbody) {
            message.textContent = 'Error: Transaction table not found in page';
            message.style.color = 'red';
            return;
        }
        tbody.innerHTML = ''; // Clear existing rows

        if (!response.ok) {
            message.textContent = transactions.message || 'Error fetching statement';
            message.style.color = 'red';
            if (response.status === 401) {
                message.textContent = 'Session expired. Please log in again.';
                localStorage.removeItem('adminToken');
                setTimeout(() => window.location.href = 'admin-login.html', 2000);
            }
            return;
        }

        if (transactions.length === 0) {
            message.textContent = 'No transactions found for this user';
            message.style.color = 'orange';
        } else {
            transactions.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(t.transaction_date).toLocaleString()}</td>
                    <td>${t.type}</td>
                    <td>₹${t.amount}</td>
                    <td>${t.recipient_account || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
            message.textContent = 'Transactions retrieved successfully';
            message.style.color = 'green';
        }
    } catch (err) {
        console.error('Fetch statement error:', err);
        message.textContent = `Error fetching statement: ${err.message}`;
        message.style.color = 'red';
    }
}

function logout() {
    userId = null;
    userName = null;
    userEmail = null;
    token = null;
    adminProfile = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('atmUserId');
    localStorage.removeItem('transactionUserId'); // Clear transactionUserId
    window.location.href = 'index.html';
}

function formatInput(input, maxLength, chunkSize) {
    let value = input.value.replace(/\s+/g, '');
    if (value.length > maxLength) {
        value = value.slice(0, maxLength);
    }
    const chunks = [];
    for (let i = 0; i < value.length; i += chunkSize) {
        chunks.push(value.slice(i, i + chunkSize));
    }
    input.value = chunks.join(' ');
}

function attachInputFormatters() {
    document.querySelectorAll('.card-number').forEach(input => {
        input.addEventListener('input', () => formatInput(input, 16, 4));
    });
    document.querySelectorAll('.account-number').forEach(input => {
        input.addEventListener('input', () => formatInput(input, 12, 4));
    });
}

// Remove the conditional fetchStatement call here since we'll trigger it via onload in transactions.html
if (window.location.pathname.includes('atm.html')) {
    showCardModal();
}
#!/bin/bash
cd /home/z/my-project

# Start server
setsid npx next dev -p 3000 </dev/null > /tmp/next-server.log 2>&1 &
SERVER_PID=$!
sleep 25

# Test 1: Register
echo "=== TEST: Register ==="
REG=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Jane Smith","username":"janesmith","email":"jane@example.com","phone":"08098765432","password":"Password@1"}')
echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); print('User:', d.get('user',{}).get('username','ERROR'), '| Referral:', d.get('user',{}).get('referralCode',''))"

# Test 2: Login
echo "=== TEST: Login ==="
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"loginId":"jane@example.com","password":"Password@1"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
echo "Token: ${TOKEN:0:30}..."

# Test 3: Wallets
echo "=== TEST: Wallets ==="
curl -s http://localhost:3000/api/user/wallets -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Reward:', d.get('reward',{}).get('balance',0), '| Deposit:', d.get('deposit',{}).get('balance',0), '| Profit:', d.get('profit',{}).get('balance',0))"

# Test 4: Activate
echo "=== TEST: Activate ==="
curl -s -X POST http://localhost:3000/api/activate \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"ACTIVATE-002"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('message','ERROR'))"

# Test 5: Deposit
echo "=== TEST: Deposit ==="
curl -s -X POST http://localhost:3000/api/deposit \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"DEPOSIT-10K"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','ERROR'), '| New Balance:', d.get('newBalance',0))"

# Test 6: Wallets after operations
echo "=== TEST: Wallets After Ops ==="
curl -s http://localhost:3000/api/user/wallets -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Reward:', d.get('reward',{}).get('balance',0), '| Deposit:', d.get('deposit',{}).get('balance',0), '| Profit:', d.get('profit',{}).get('balance',0))"

# Test 7: Ads
echo "=== TEST: Ads ==="
curl -s http://localhost:3000/api/ads | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d.get("ads",[]))} ads available')"

# Test 8: Tasks
echo "=== TEST: Tasks ==="
curl -s http://localhost:3000/api/tasks | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d.get("tasks",[]))} tasks available')"

# Test 9: Admin Login
echo "=== TEST: Admin Login ==="
ADMIN_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"loginId":"admin@alcoin.com","password":"Admin@123"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
ADMIN_USER=$(echo "$ADMIN_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('role',''))" 2>/dev/null)
echo "Admin role: $ADMIN_USER"

# Test 10: Admin Analytics
echo "=== TEST: Admin Analytics ==="
curl -s http://localhost:3000/api/admin/analytics -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Total Users:', d.get('totalUsers',0), '| Activated:', d.get('activatedUsers',0), '| Total Deposits:', d.get('totalDeposits',0))"

echo ""
echo "=== ALL TESTS COMPLETE ==="

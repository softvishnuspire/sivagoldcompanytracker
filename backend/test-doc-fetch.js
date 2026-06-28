async function testFetch() {
  try {
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'tc@shivagold.com',
        password: 'password123'
      })
    });

    if (!loginRes.ok) {
      console.error('Login failed:', loginRes.status, await loginRes.text());
      return;
    }

    const { token } = await loginRes.json();
    console.log('Login successful! Token acquired.');

    console.log('Fetching documents/leads...');
    const docRes = await fetch('http://localhost:5001/api/documents/leads', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response status:', docRes.status);
    console.log('Response OK:', docRes.ok);
    const bodyText = await docRes.text();
    console.log('Response Body:', bodyText.substring(0, 500));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testFetch();

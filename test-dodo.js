async function testDodo() {
  const dodoKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!dodoKey) {
    console.log("No DODO_PAYMENTS_API_KEY found");
    return;
  }

  const url = 'https://test.dodopayments.com';

  console.log(`Testing against ${url}`);

  try {
    const res = await fetch(`${url}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          customer_id: "cus_dummy123"
        },
        product_cart: [
          {
            product_id: "prod_dummy123",
            quantity: 1
          }
        ],
        success_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/cancel"
      })
    });
    
    const data = await res.json();
    console.log("PAYMENTS POST RESPONSE:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("FETCH ERROR:", err);
  }
}

testDodo();

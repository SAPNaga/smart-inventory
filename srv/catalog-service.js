const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { Books } = this.entities;

  // Function: read books with stock < 5
  this.on('getLowStockBooks', async () => {
    const result = await SELECT.from(Books).where({ stock: { '<': 5 } });
    console.log(`[getLowStockBooks] returning ${result.length} low-stock books`);
    return result;
  });

  // Action: restock all low-stock books by `amount`
  this.on('restockBooks', async (req) => {
    const { amount } = req.data;

    if (!amount || amount < 1) {
      return req.error(400, 'amount must be a positive number');
    }

    // Fetch low-stock books first
    const low = await SELECT.from(Books).where({ stock: { '<': 5 } });

    // Update each one's stock
    for (const b of low) {
      await UPDATE(Books).set({ stock: b.stock + amount }).where({ ID: b.ID });
    }

    // Return updated rows
    const updated = await SELECT.from(Books).where({ ID: { in: low.map(b => b.ID) } });
    console.log(`[restockBooks] restocked ${updated.length} books by +${amount}`);
    return updated;
  });
});

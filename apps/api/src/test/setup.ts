import { prisma } from '@hums/database';

// Connect to test database before all tests
beforeAll(async () => {
  // Ensure database connection is established
  await prisma.$connect();
}, 30000);

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Clean up between tests if needed
// Note: Be careful with this in a shared test database
// Consider using transactions for test isolation instead

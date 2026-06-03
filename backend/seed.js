const bcrypt = require('bcryptjs');
const { supabase } = require('./db/supabase');

async function seed() {
  console.log('Starting database seeding with uppercase roles...');

  const usersToSeed = [
    {
      employee_code: 'EMP-MD-001',
      name: 'MD Shiva Gold',
      mobile: '9000000001',
      email: 'md@shivagold.com',
      role: 'MD',
      password: 'password123',
    },
    {
      employee_code: 'EMP-RM-001',
      name: 'RM Shiva Gold',
      mobile: '9000000002',
      email: 'rm@shivagold.com',
      role: 'RM',
      password: 'password123',
    },
    {
      employee_code: 'EMP-EX-001',
      name: 'Executive Shiva Gold 1',
      mobile: '9000000003',
      email: 'exec1@shivagold.com',
      role: 'EXECUTIVE',
      password: 'password123',
    },
    {
      employee_code: 'EMP-EX-002',
      name: 'Executive Shiva Gold 2',
      mobile: '9000000004',
      email: 'exec2@shivagold.com',
      role: 'EXECUTIVE',
      password: 'password123',
    },
    {
      employee_code: 'EMP-TC-001',
      name: 'Telecaller Shiva Gold',
      mobile: '9000000005',
      email: 'tc@shivagold.com',
      role: 'TELECALLER',
      password: 'password123',
    },
  ];

  for (const user of usersToSeed) {
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', user.mobile)
      .maybeSingle();

    if (fetchError) {
      console.error(`Error checking user ${user.mobile}:`, fetchError.message);
      continue;
    }

    if (existingUser) {
      console.log(`User with mobile ${user.mobile} already exists (${existingUser.name}). Skipping.`);
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(user.password, salt);

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          employee_code: user.employee_code,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
          password_hash: password_hash,
          status: 'active',
        },
      ])
      .select();

    if (insertError) {
      console.error(`Error inserting user ${user.mobile}:`, insertError.message);
    } else {
      console.log(`Successfully seeded user: ${user.name} (${user.role}) - Password: ${user.password}`);
    }
  }

  console.log('Seeding process finished.');
}

seed().catch((err) => {
  console.error('Seeding crashed:', err);
  process.exit(1);
});

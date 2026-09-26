// mongo-server/scripts/resetDatabase.js
// Drops the csrdynamicform MongoDB database and re-runs bootstrap and seeders
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { bootstrap } = require('../src/bootstrap');
const { seedCoreForms } = require('../src/seedCoreForms');
const { seedVolunteeringForms } = require('../src/seedVolunteeringForms');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csrdynamicform_db';

async function resetDatabase() {
  console.log('🔄 Connecting to MongoDB to drop database...');
  await mongoose.connect(MONGO_URI);
  console.log('💥 Dropping database:', mongoose.connection.name);
  await mongoose.connection.dropDatabase();
  console.log('✅ Database dropped cleanly.\n');
  await mongoose.disconnect();

  console.log('🚀 Running 1/3: Bootstrap (Roles, Permissions, Users, Menus, Settings)...');
  await bootstrap();

  console.log('\n🚀 Running 2/3: Core Forms Seeder...');
  await seedCoreForms();

  console.log('\n🚀 Running 3/3: Volunteering Forms & Stories Seeder...');
  await seedVolunteeringForms();

  console.log('\n🎉 ALL SEEDERS FINISHED SUCCESSFULLY! Database is ready.');
}

if (require.main === module) {
  resetDatabase().catch(err => {
    console.error('❌ Reset database failed:', err);
    process.exit(1);
  });
}

module.exports = { resetDatabase };

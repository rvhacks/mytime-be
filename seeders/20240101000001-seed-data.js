'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Pre-defined UUIDs for stable references
const DES_SE = uuidv4(), DES_SSE = uuidv4(), DES_TL = uuidv4(), DES_PM = uuidv4(), DES_QA = uuidv4(), DES_BA = uuidv4();
const USER_ADMIN = uuidv4(), USER_SARAH = uuidv4(), USER_MIKE = uuidv4(), USER_EMILY = uuidv4(), USER_DAVID = uuidv4();
const PROJ_PHOENIX = uuidv4(), PROJ_ATLAS = uuidv4(), PROJ_NEXUS = uuidv4(), PROJ_ORION = uuidv4();

module.exports = {
  async up(queryInterface) {
    const pw = await bcrypt.hash('admin123', 12);
    const empPw = await bcrypt.hash('ALEX123401015', 12); // Example auto pw

    // Designations
    await queryInterface.bulkInsert('designations', [
      { id: DES_SE, name: 'Software Engineer', created_at: new Date(), updated_at: new Date() },
      { id: DES_SSE, name: 'Senior Software Engineer', created_at: new Date(), updated_at: new Date() },
      { id: DES_TL, name: 'Tech Lead', created_at: new Date(), updated_at: new Date() },
      { id: DES_PM, name: 'Project Manager', created_at: new Date(), updated_at: new Date() },
      { id: DES_QA, name: 'QA Engineer', created_at: new Date(), updated_at: new Date() },
      { id: DES_BA, name: 'Business Analyst', created_at: new Date(), updated_at: new Date() },
    ]);

    // Users
    await queryInterface.bulkInsert('users', [
      {
        id: USER_ADMIN, first_name: 'Alex', last_name: 'Johnson', email: 'admin@crystalts.com',
        password: pw, mobile: '5551234567', dob: '1990-05-15', role: 'admin',
        designation_id: DES_TL, department: 'Engineering', joining_date: '2023-01-10', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_SARAH, first_name: 'Sarah', last_name: 'Williams', email: 'sarah@crystalts.com',
        password: pw, mobile: '5559876543', dob: '1988-09-22', role: 'manager',
        designation_id: DES_PM, department: 'Management', joining_date: '2023-02-15', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_MIKE, first_name: 'Mike', last_name: 'Chen', email: 'mike@crystalts.com',
        password: pw, mobile: '5551112233', dob: '1992-03-10', role: 'employee',
        designation_id: DES_SE, department: 'Engineering', joining_date: '2023-06-01', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_EMILY, first_name: 'Emily', last_name: 'Rodriguez', email: 'emily@crystalts.com',
        password: pw, mobile: '5554445566', dob: '1991-07-18', role: 'employee',
        designation_id: DES_SSE, department: 'Engineering', joining_date: '2023-04-20', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_DAVID, first_name: 'David', last_name: 'Kim', email: 'david@crystalts.com',
        password: pw, mobile: '5557778899', dob: '1993-11-05', role: 'employee',
        designation_id: DES_QA, department: 'QA', joining_date: '2023-08-15', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
    ]);

    // Projects
    await queryInterface.bulkInsert('projects', [
      {
        id: PROJ_PHOENIX, project_code: 'PHX', name: 'Phoenix Platform', description: 'Enterprise SaaS platform',
        color: '#6366f1', start_date: '2024-01-01', end_date: '2024-12-31', status: 'active',
        reporting_managers: `{${USER_SARAH},${USER_ADMIN}}`,
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: PROJ_ATLAS, project_code: 'ATL', name: 'Atlas CRM', description: 'Customer relationship management',
        color: '#10b981', start_date: '2024-02-01', end_date: '2024-09-30', status: 'active',
        reporting_managers: `{${USER_SARAH}}`,
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: PROJ_NEXUS, project_code: 'NXS', name: 'Nexus Analytics', description: 'Data analytics engine',
        color: '#f59e0b', start_date: '2024-03-15', end_date: '2024-11-30', status: 'active',
        reporting_managers: `{${USER_ADMIN}}`,
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: PROJ_ORION, project_code: 'ORN', name: 'Orion Mobile', description: 'Cross-platform mobile app',
        color: '#8b5cf6', start_date: '2024-01-15', end_date: '2024-06-30', status: 'completed',
        reporting_managers: `{${USER_SARAH}}`,
        created_at: new Date(), updated_at: new Date(),
      },
    ]);

    // Milestones
    await queryInterface.bulkInsert('milestones', [
      { id: uuidv4(), project_id: PROJ_PHOENIX, name: 'MVP Release', status: 'completed', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), project_id: PROJ_PHOENIX, name: 'Beta Launch', status: 'in-progress', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), project_id: PROJ_PHOENIX, name: 'GA Release', status: 'pending', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), project_id: PROJ_ATLAS, name: 'Design Phase', status: 'completed', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), project_id: PROJ_ATLAS, name: 'Development Sprint 1', status: 'in-progress', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), project_id: PROJ_NEXUS, name: 'Data Pipeline Setup', status: 'pending', created_at: new Date(), updated_at: new Date() },
    ]);

    // Assignments
    await queryInterface.bulkInsert('project_assignments', [
      { id: uuidv4(), user_id: USER_MIKE, project_id: PROJ_PHOENIX, rm_id: USER_SARAH, role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_EMILY, project_id: PROJ_PHOENIX, rm_id: USER_SARAH, role: 'MS', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_DAVID, project_id: PROJ_PHOENIX, rm_id: USER_ADMIN, role: 'QA', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_MIKE, project_id: PROJ_ATLAS, rm_id: USER_SARAH, role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_EMILY, project_id: PROJ_NEXUS, rm_id: USER_ADMIN, role: 'TPM', created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('project_assignments', null, {});
    await queryInterface.bulkDelete('milestones', null, {});
    await queryInterface.bulkDelete('projects', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('designations', null, {});
  },
};

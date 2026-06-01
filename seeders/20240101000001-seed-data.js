'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

// Pre-defined UUIDs for stable references
const DES_SE = uuidv4(), DES_SSE = uuidv4(), DES_TL = uuidv4(), DES_PM = uuidv4(), DES_QA = uuidv4(), DES_BA = uuidv4();
const USER_ADMIN = uuidv4(), USER_SARAH = uuidv4(), USER_MIKE = uuidv4(), USER_EMILY = uuidv4(), USER_DAVID = uuidv4();
const PROJ_PHOENIX = uuidv4(), PROJ_ATLAS = uuidv4(), PROJ_NEXUS = uuidv4(), PROJ_ORION = uuidv4();

module.exports = {
  async up(queryInterface) {
    const pw = await bcrypt.hash('Password@123', 12);

    // Designations
    await queryInterface.bulkInsert('designations', [
      { id: DES_SE, name: 'Software Engineer', created_at: new Date(), updated_at: new Date() },
      { id: DES_SSE, name: 'Senior Software Engineer', created_at: new Date(), updated_at: new Date() },
      { id: DES_TL, name: 'Tech Lead', created_at: new Date(), updated_at: new Date() },
      { id: DES_PM, name: 'Project Manager', created_at: new Date(), updated_at: new Date() },
      { id: DES_QA, name: 'QA Engineer', created_at: new Date(), updated_at: new Date() },
      { id: DES_BA, name: 'Business Analyst', created_at: new Date(), updated_at: new Date() },
    ]);

    // Users (role is 'admin' or 'employee'; manager status is dynamic based on direct reports)
    await queryInterface.bulkInsert('users', [
      {
        id: USER_ADMIN, employee_id: 'CT26-0001',
        first_name: 'Alex', last_name: 'Johnson', email: 'admin@crystalts.com',
        password: pw, mobile: '5551234567', dob: '1990-05-15', role: 'admin',
        designation_id: DES_TL, joining_date: '2023-01-10', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_SARAH, employee_id: 'CT26-0002',
        first_name: 'Sarah', last_name: 'Williams', email: 'sarah@crystalts.com',
        password: pw, mobile: '5559876543', dob: '1988-09-22', role: 'employee',
        designation_id: DES_PM, joining_date: '2023-02-15', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_MIKE, employee_id: 'CT26-0003',
        first_name: 'Mike', last_name: 'Chen', email: 'mike@crystalts.com',
        password: pw, mobile: '5551112233', dob: '1992-03-10', role: 'employee',
        designation_id: DES_SE, joining_date: '2023-06-01', status: 'active',
        reporting_manager_id: USER_SARAH,
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_EMILY, employee_id: 'CT26-0004',
        first_name: 'Emily', last_name: 'Rodriguez', email: 'emily@crystalts.com',
        password: pw, mobile: '5554445566', dob: '1991-07-18', role: 'employee',
        designation_id: DES_SSE, joining_date: '2023-04-20', status: 'active',
        reporting_manager_id: USER_SARAH,
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: USER_DAVID, employee_id: 'CT26-0005',
        first_name: 'David', last_name: 'Kim', email: 'david@crystalts.com',
        password: pw, mobile: '5557778899', dob: '1993-11-05', role: 'employee',
        designation_id: DES_QA, joining_date: '2023-08-15', status: 'active',
        reporting_manager_id: USER_ADMIN,
        created_at: new Date(), updated_at: new Date(),
      },
    ]);

    // Projects (no reporting_managers column — RM is per-user via reporting_manager_id)
    await queryInterface.bulkInsert('projects', [
      {
        id: PROJ_PHOENIX, project_code: 'PHX', project_id: 'PRJ26-0001',
        name: 'Phoenix Platform', description: 'Enterprise SaaS platform',
        color: '#6366f1', start_date: '2024-01-01', end_date: '2024-12-31', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: PROJ_ATLAS, project_code: 'ATL', project_id: 'PRJ26-0002',
        name: 'Atlas CRM', description: 'Customer relationship management',
        color: '#10b981', start_date: '2024-02-01', end_date: '2024-09-30', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: PROJ_NEXUS, project_code: 'NXS', project_id: 'PRJ26-0003',
        name: 'Nexus Analytics', description: 'Data analytics engine',
        color: '#f59e0b', start_date: '2024-03-15', end_date: '2024-11-30', status: 'active',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: PROJ_ORION, project_code: 'ORN', project_id: 'PRJ26-0004',
        name: 'Orion Mobile', description: 'Cross-platform mobile app',
        color: '#8b5cf6', start_date: '2024-01-15', end_date: '2024-06-30', status: 'completed',
        created_at: new Date(), updated_at: new Date(),
      },
    ]);

    // Milestones (role-based templates — no project_id, no status)
    await queryInterface.bulkInsert('milestones', [
      { id: uuidv4(), name: 'MVP Release', description: 'First minimal viable product release', role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Beta Launch', description: 'Beta version launch', role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'GA Release', description: 'General availability release', role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Design Phase', description: 'UI/UX design phase', role: 'BA', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Development Sprint', description: 'Active development sprint', role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Data Pipeline Setup', description: 'Setting up data pipelines', role: 'TPM', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'QA Testing', description: 'Quality assurance testing cycle', role: 'QA', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Code Review', description: 'Peer code review', role: 'MS', created_at: new Date(), updated_at: new Date() },
    ]);

    // Assignments (no rm_id — RM is tracked via users.reporting_manager_id)
    await queryInterface.bulkInsert('project_assignments', [
      { id: uuidv4(), user_id: USER_MIKE, project_id: PROJ_PHOENIX, role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_EMILY, project_id: PROJ_PHOENIX, role: 'MS', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_DAVID, project_id: PROJ_PHOENIX, role: 'QA', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_MIKE, project_id: PROJ_ATLAS, role: 'IC', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), user_id: USER_EMILY, project_id: PROJ_NEXUS, role: 'TPM', created_at: new Date(), updated_at: new Date() },
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

const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const designationRepository = require('../repositories/designationRepository');
const projectRepository = require('../repositories/projectRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const milestoneRepository = require('../repositories/milestoneRepository');
const { generateAutoPassword, generateProjectId } = require('../utils/helpers');
const AppError = require('../utils/AppError');

class AdminService {
  // ---- DESIGNATIONS ----
  async getDesignations() { return designationRepository.findAll(); }

  async createDesignation(name) {
    const existing = await designationRepository.findByName(name);
    if (existing) throw new AppError('Designation already exists', 409);
    return designationRepository.create({ name });
  }

  async updateDesignation(id, name) {
    const existing = await designationRepository.findById(id);
    if (!existing) throw new AppError('Designation not found', 404);
    return designationRepository.update(id, { name });
  }

  async deleteDesignation(id) {
    const existing = await designationRepository.findById(id);
    if (!existing) throw new AppError('Designation not found', 404);
    return designationRepository.delete(id);
  }

  // ---- EMPLOYEES ----
  async getEmployees(options) { return userRepository.findAll(options); }

  async createEmployee(data) {
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) throw new AppError('Email already exists', 409);

    const autoPassword = generateAutoPassword(data.firstName, data.mobile, data.dob);
    const hashedPassword = await bcrypt.hash(autoPassword, 12);

    const user = await userRepository.create({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      mobile: data.mobile,
      dob: data.dob,
      password: hashedPassword,
      role: data.role || 'employee',
      designation_id: data.designationId,
      department: data.department,
      joining_date: data.joiningDate,
      status: 'active',
    });

    const userData = await userRepository.findById(user.id);
    return { user: userData, generatedPassword: autoPassword };
  }

  async updateEmployee(id, data) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);

    const updateData = {};
    if (data.firstName) updateData.first_name = data.firstName;
    if (data.lastName) updateData.last_name = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.mobile) updateData.mobile = data.mobile;
    if (data.dob) updateData.dob = data.dob;
    if (data.designationId) updateData.designation_id = data.designationId;
    if (data.department) updateData.department = data.department;
    if (data.joiningDate) updateData.joining_date = data.joiningDate;
    if (data.role) updateData.role = data.role;

    // Regenerate password if name/mobile/dob changed
    if (data.firstName || data.mobile || data.dob) {
      const fn = data.firstName || existing.first_name;
      const mob = data.mobile || existing.mobile;
      const dob = data.dob || existing.dob;
      const autoPassword = generateAutoPassword(fn, mob, dob);
      updateData.password = await bcrypt.hash(autoPassword, 12);
    }

    return userRepository.update(id, updateData);
  }

  async deleteEmployee(id) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);
    return userRepository.delete(id);
  }

  // ---- PROJECTS ----
  async getProjects(options) { return projectRepository.findAll(options); }

  async createProject(data) {
    const code = data.projectCode || generateProjectId();
    const existingCode = await projectRepository.findByCode(code);
    if (existingCode) throw new AppError('Project code already exists', 409);

    return projectRepository.create({
      project_code: code,
      name: data.name,
      description: data.description,
      color: data.color,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status,
      reporting_managers: data.reportingManagers || [],
    });
  }

  async updateProject(id, data) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw new AppError('Project not found', 404);

    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color) updateData.color = data.color;
    if (data.startDate) updateData.start_date = data.startDate;
    if (data.endDate) updateData.end_date = data.endDate;
    if (data.status) updateData.status = data.status;
    if (data.reportingManagers) updateData.reporting_managers = data.reportingManagers;

    return projectRepository.update(id, updateData);
  }

  async deleteProject(id) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw new AppError('Project not found', 404);
    return projectRepository.delete(id);
  }

  // ---- ASSIGNMENTS ----
  async getAssignments(options) { return assignmentRepository.findAll(options); }

  async createAssignment(data) {
    const existing = await assignmentRepository.findByUserAndProject(data.userId, data.projectId);
    if (existing) throw new AppError('Employee is already assigned to this project', 409);

    return assignmentRepository.create({
      user_id: data.userId,
      project_id: data.projectId,
      rm_id: data.rmId,
      role: data.role,
    });
  }

  async deleteAssignment(id) {
    const existing = await assignmentRepository.findById(id);
    if (!existing) throw new AppError('Assignment not found', 404);
    return assignmentRepository.delete(id);
  }

  // ---- MILESTONES ----
  async getMilestones(options) { return milestoneRepository.findAll(options); }

  async createMilestone(data) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw new AppError('Project not found', 404);

    return milestoneRepository.create({
      project_id: data.projectId,
      name: data.name,
      description: data.description,
      role: data.role || null,
    });
  }

  async updateMilestone(id, data) {
    const existing = await milestoneRepository.findById(id);
    if (!existing) throw new AppError('Milestone not found', 404);
    return milestoneRepository.update(id, data);
  }

  async deleteMilestone(id) {
    const existing = await milestoneRepository.findById(id);
    if (!existing) throw new AppError('Milestone not found', 404);
    return milestoneRepository.delete(id);
  }
}

module.exports = new AdminService();

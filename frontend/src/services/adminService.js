import { apiRequest } from './apiClient';

export const adminService = {
  /**
   * Fetch platform administrative summary metrics.
   */
  async getSummary() {
    return apiRequest('/admin/summary');
  },

  /**
   * List users with optional search, role, status, and pagination.
   */
  async getUsers({ search = '', role = '', onboardingStatus = '', enabled = '', page = 0, size = 20 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (onboardingStatus) params.append('onboardingStatus', onboardingStatus);
    if (enabled !== '' && enabled !== null && enabled !== undefined) params.append('enabled', enabled);
    params.append('page', page);
    params.append('size', size);

    return apiRequest(`/admin/users?${params.toString()}`);
  },

  /**
   * Fetch individual user details by ID.
   */
  async getUserById(id) {
    return apiRequest(`/admin/users/${id}`);
  },

  /**
   * Activate or deactivate a user account.
   */
  async updateUserStatus(id, enabled) {
    return apiRequest(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { enabled }
    });
  },

  /**
   * Change user role (ACCOUNT_HOLDER, ADMINISTRATOR, AUDITOR).
   */
  async updateUserRole(id, role) {
    return apiRequest(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: { role }
    });
  },

  /**
   * List onboarding requests.
   */
  async getOnboardingRequests({ status = 'PENDING', page = 0, size = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page);
    params.append('size', size);

    return apiRequest(`/admin/onboarding?${params.toString()}`);
  },

  /**
   * Approve a user's onboarding request.
   */
  async approveOnboarding(id) {
    return apiRequest(`/admin/onboarding/${id}/approve`, {
      method: 'POST'
    });
  },

  /**
   * Reject a user's onboarding request with an optional reason.
   */
  async rejectOnboarding(id, reason = '') {
    return apiRequest(`/admin/onboarding/${id}/reject`, {
      method: 'POST',
      body: { reason }
    });
  },

  /**
   * Fetch paginated audit trail logs.
   */
  async getAuditTrail({ eventType = '', actorId = '', status = '', query = '', page = 0, size = 20 } = {}) {
    const params = new URLSearchParams();
    if (eventType) params.append('eventType', eventType);
    if (actorId) params.append('actorId', actorId);
    if (status) params.append('status', status);
    if (query) params.append('query', query);
    params.append('page', page);
    params.append('size', size);

    return apiRequest(`/admin/audit?${params.toString()}`);
  },

  /**
   * Bootstrap the first system administrator using a server-side secret.
   */
  async bootstrapAdmin({ name, email, password, bootstrapSecret }) {
    return apiRequest('/auth/bootstrap-admin', {
      method: 'POST',
      body: { name, email, password, bootstrapSecret }
    });
  }
};


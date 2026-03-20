/**
 * Dashboard E2E Tests
 */

describe('Dashboard', () => {
  beforeEach(() => {
    // Login before each test
    cy.login(Cypress.env('email'), Cypress.env('password'));
  });

  describe('Navigation', () => {
    it('displays header with user info', () => {
      cy.get('header').should('be.visible');
      cy.contains('Gyandeep').should('be.visible');
    });

    it('has working navigation menu', () => {
      cy.get('nav').should('be.visible');
    });

    it('shows logout option', () => {
      cy.contains('Logout').should('be.visible');
    });
  });

  describe('Admin Dashboard', () => {
    beforeEach(() => {
      cy.visit('/admin');
    });

    it('displays user management section', () => {
      cy.contains('Users').should('be.visible');
    });

    it('displays class management', () => {
      cy.contains('Classes').should('be.visible');
    });

    it('displays settings', () => {
      cy.contains('Settings').should('be.visible');
    });
  });

  describe('Teacher Dashboard', () => {
    beforeEach(() => {
      cy.visit('/teacher');
    });

    it('displays attendance section', () => {
      cy.contains('Attendance').should('be.visible');
    });

    it('displays quiz management', () => {
      cy.contains('Quiz').should('be.visible');
    });

    it('displays class sessions', () => {
      cy.contains('Session').should('be.visible');
    });
  });

  describe('Student Dashboard', () => {
    beforeEach(() => {
      cy.visit('/student');
    });

    it('displays attendance tracker', () => {
      cy.contains('Attendance').should('be.visible');
    });

    it('displays grades', () => {
      cy.contains('Grades').should('be.visible');
    });

    it('displays schedule', () => {
      cy.contains('Schedule').should('be.visible');
    });
  });
});

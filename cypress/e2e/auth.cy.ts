/**
 * Authentication E2E Tests
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Login Page', () => {
    it('displays login form', () => {
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('shows validation errors for empty fields', () => {
      cy.get('button[type="submit"]').click();
      cy.contains('Email is required').should('be.visible');
    });

    it('shows error for invalid email', () => {
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      cy.contains('Invalid email').should('be.visible');
    });
  });

  describe('User Login', () => {
    it('logs in successfully with valid credentials', () => {
      // Note: This test requires a user to exist in the database
      cy.get('input[type="email"]').type('admin@example.com');
      cy.get('input[type="password"]').type('AdminPassword123!');
      cy.get('button[type="submit"]').click();
      cy.url().should('not.include', '/login');
    });

    it('shows error for invalid credentials', () => {
      cy.get('input[type="email"]').type('wrong@example.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      cy.contains('Invalid credentials').should('be.visible');
    });
  });

  describe('Password Reset', () => {
    it('shows password reset form', () => {
      cy.contains('Forgot password?').click();
      cy.get('input[type="email"]').should('be.visible');
    });

    it('sends reset code for valid email', () => {
      cy.contains('Forgot password?').click();
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();
      cy.contains('reset code').should('be.visible');
    });
  });
});

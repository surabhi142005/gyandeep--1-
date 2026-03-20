/**
 * Attendance E2E Tests
 */

describe('Attendance', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email'), Cypress.env('password'));
    cy.visit('/teacher');
  });

  describe('Attendance Marking', () => {
    it('displays attendance interface', () => {
      cy.contains('Attendance').click();
      cy.get('button[aria-label="Mark Present"]').should('be.visible');
      cy.get('button[aria-label="Mark Absent"]').should('be.visible');
    });

    it('marks student as present', () => {
      cy.contains('Attendance').click();
      cy.get('[data-testid="student-item"]').first().click();
      cy.contains('Present').click();
      cy.contains('Present').should('be.visible');
    });

    it('marks student as absent', () => {
      cy.contains('Attendance').click();
      cy.get('[data-testid="student-item"]').first().click();
      cy.contains('Absent').click();
      cy.contains('Absent').should('be.visible');
    });
  });

  describe('Attendance History', () => {
    it('shows attendance history', () => {
      cy.contains('Attendance').click();
      cy.contains('History').click();
      cy.get('table').should('be.visible');
    });

    it('filters by date', () => {
      cy.contains('Attendance').click();
      cy.contains('History').click();
      cy.get('input[type="date"]').type('2024-01-01');
      cy.get('button[type="submit"]').click();
      // Table should update
    });
  });
});

describe('Student Attendance View', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email'), Cypress.env('password'));
    cy.visit('/student');
  });

  it('displays attendance record', () => {
    cy.contains('Attendance').click();
    cy.get('text').should('contain', 'Present');
  });

  it('shows attendance percentage', () => {
    cy.contains('Attendance').click();
    cy.contains('%').should('be.visible');
  });
});

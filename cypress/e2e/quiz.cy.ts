/**
 * Quiz E2E Tests
 */

describe('Quiz', () => {
  beforeEach(() => {
    cy.login(Cypress.env('email'), Cypress.env('password'));
  });

  describe('Teacher Quiz Management', () => {
    beforeEach(() => {
      cy.visit('/teacher');
    });

    it('displays quiz creation option', () => {
      cy.contains('Quiz').click();
      cy.contains('Create Quiz').should('be.visible');
    });

    it('opens quiz creation modal', () => {
      cy.contains('Quiz').click();
      cy.contains('Create Quiz').click();
      cy.get('input[name="title"]').should('be.visible');
    });

    it('creates a new quiz', () => {
      cy.contains('Quiz').click();
      cy.contains('Create Quiz').click();
      cy.get('input[name="title"]').type('Math Quiz 1');
      cy.get('textarea[name="description"]').type('Basic math questions');
      cy.contains('Add Question').click();
      cy.get('input[name="question"]').type('What is 2+2?');
      cy.get('input[value="A"]').type('3');
      cy.get('input[value="B"]').type('4');
      cy.get('input[value="C"]').type('5');
      cy.get('input[value="D"]').type('6');
      cy.contains('Save Quiz').click();
      cy.contains('Math Quiz 1').should('be.visible');
    });
  });

  describe('Student Quiz Taking', () => {
    beforeEach(() => {
      cy.visit('/student');
    });

    it('displays available quizzes', () => {
      cy.contains('Quiz').click();
      cy.get('[data-testid="quiz-card"]').should('have.length.greaterThan', 0);
    });

    it('starts a quiz', () => {
      cy.contains('Quiz').click();
      cy.get('[data-testid="quiz-card"]').first().click();
      cy.contains('Start').click();
      cy.get('[data-testid="question-text"]').should('be.visible');
    });

    it('submits answers', () => {
      cy.contains('Quiz').click();
      cy.get('[data-testid="quiz-card"]').first().click();
      cy.contains('Start').click();
      cy.get('input[type="radio"]').first().check();
      cy.contains('Submit').click();
      cy.contains('Quiz submitted').should('be.visible');
    });
  });

  describe('Quiz Results', () => {
    beforeEach(() => {
      cy.visit('/student');
    });

    it('displays quiz results', () => {
      cy.contains('Quiz').click();
      cy.contains('My Results').click();
      cy.get('text').should('contain', 'Score');
    });
  });
});

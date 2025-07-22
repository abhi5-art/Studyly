import React, { useState } from 'react';

const QuizPage = () => {
  // Define questions, options, and the correct answers
  const questions = [
    {
      id: 1,
      questionText: "What is the capital of France?",
      options: ["Berlin", "Madrid", "Paris", "Rome"],
      correctAnswer: "Paris",
      
    },
    {
      id: 2,
      questionText: "Which planet is known as the Red Planet?",
      options: ["Earth", "Mars", "Jupiter", "Saturn"],
      correctAnswer: "Mars",
    },
    {
      id: 3,
      questionText: "What is the largest animal in the world?",
      options: ["Elephant", "Blue Whale", "Shark", "Giraffe"],
      correctAnswer: "Blue Whale",
    },
  ];

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleChange = (questionId, selectedAnswer) => {
    setAnswers({
      ...answers,
      [questionId]: selectedAnswer,
    });
  };

  const handleSubmit = () => {
    let calculatedScore = 0;
    questions.forEach((question) => {
      if (answers[question.id] === question.correctAnswer) {
        calculatedScore += 1;
      }
    });
    setScore(calculatedScore);
    setSubmitted(true);
  };

  return (
    <div
      style={{
        position: 'fixed', // Fix the quiz component to the screen
        top: '20%', // Adjust the top position
        left: '50%',
        transform: 'translateX(-50%)', // Center the quiz horizontally
        width: '100%',
        maxWidth: '600px', // Adjust the width as needed
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '10px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
        zIndex: 9999, // Ensure quiz stays on top of other content
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '20px',
        }}
      >
        Basic Quiz
      </h1>
      <div style={{ marginBottom: '20px' }}>
        {questions.map((question) => (
          <div key={question.id} style={{ marginBottom: '15px' }}>
            <p>{question.questionText}</p>
            <div style={{ marginTop: '10px' }}>
              {question.options.map((option) => (
                <div key={option} style={{ marginBottom: '10px' }}>
                  <input
                    type="radio"
                    id={`${question.id}-${option}`}
                    name={`question-${question.id}`}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() => handleChange(question.id, option)}
                    disabled={submitted}
                    style={{ marginRight: '10px' }}
                  />
                  <label htmlFor={`${question.id}-${option}`}>{option}</label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!submitted ? (
        <button
          onClick={handleSubmit}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            fontSize: '1rem',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Submit Quiz
        </button>
      ) : (
        <div
          style={{
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          <p>
            You scored {score} out of {questions.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuizPage;

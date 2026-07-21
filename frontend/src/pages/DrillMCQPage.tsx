/**
 * Drill MCQ page — Stage 2: three multiple-choice questions.
 * Shows one question at a time with option cards and explanations.
 */

import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { submitMCQAnswer } from '../lib/api';
import type { DrillResponse, MCQuestion } from '../types';
import { HelpCircle, ArrowRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function DrillMCQPage() {
  const { drillId } = useParams<{ drillId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const drill = location.state as DrillResponse | undefined;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!drill || !drillId) {
    return (
      <div className="page page-centered">
        <div className="glass-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={40} className="text-error" style={{ marginBottom: 'var(--space-md)' }} />
          <h2>Drill Not Found</h2>
          <button className="btn btn-primary mt-lg" onClick={() => navigate('/')}>Go to Narrate</button>
        </div>
      </div>
    );
  }

  const questions = drill.content.questions;
  const question: MCQuestion = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const mcqStep = drill.steps.find(s => s.step_type === 'mcq');

  const handleSelect = (optionId: string) => {
    if (submitted) return;
    setSelectedOption(optionId);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || !mcqStep) return;

    setSubmitting(true);

    try {
      await submitMCQAnswer(mcqStep.id, selectedOption);
    } catch (err) {
      console.error('Failed to submit MCQ answer:', err);
      // Continue anyway — not blocking the flow for MCQ storage failures
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  const handleNext = () => {
    if (isLast) {
      navigate(`/drill/${drillId}/scenario`, { state: drill });
    } else {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setSubmitted(false);
    }
  };

  const getOptionClass = (optionId: string) => {
    if (!submitted) {
      return selectedOption === optionId ? 'option-card option-card--selected' : 'option-card';
    }
    if (optionId === question.correct_option_id) {
      return 'option-card option-card--correct';
    }
    if (optionId === selectedOption && optionId !== question.correct_option_id) {
      return 'option-card option-card--incorrect';
    }
    return 'option-card';
  };

  const getOptionIdClass = (optionId: string) => {
    if (!submitted) {
      return selectedOption === optionId ? 'option-card--selected' : '';
    }
    if (optionId === question.correct_option_id) return 'option-card--correct';
    if (optionId === selectedOption) return 'option-card--incorrect';
    return '';
  };

  return (
    <div className="page">
      <div className="container">
        <div className="animate-slide-up">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step-dot step-dot--completed">✓</div>
            <div className="step-line step-line--completed" />
            <div className="step-dot step-dot--active">2</div>
            <div className="step-line" />
            <div className="step-dot step-dot--upcoming">3</div>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-md)',
            }}>
              <HelpCircle size={24} style={{ color: 'var(--color-accent-secondary)' }} />
            </div>
            <h2>Test Your Understanding</h2>
            <p className="text-sm text-muted mt-sm">
              Question {currentIdx + 1} of {questions.length}
            </p>
          </div>

          {/* Question */}
          <div className="glass-card glass-card--elevated" style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-xl)', lineHeight: 1.6, fontSize: '1.05rem' }}>
              {question.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className={getOptionClass(option.id)}
                  onClick={() => handleSelect(option.id)}
                  style={{ cursor: submitted ? 'default' : 'pointer' }}
                >
                  <div className={`option-id ${getOptionIdClass(option.id)}`}>
                    {submitted && option.id === question.correct_option_id ? (
                      <CheckCircle size={16} />
                    ) : submitted && option.id === selectedOption && option.id !== question.correct_option_id ? (
                      <XCircle size={16} />
                    ) : (
                      option.id.toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--color-text-primary)', marginBottom: submitted ? '6px' : 0 }}>
                      {option.statement}
                    </p>
                    {submitted && (
                      <p className="text-sm animate-slide-down" style={{
                        color: option.id === question.correct_option_id
                          ? 'var(--color-success)'
                          : 'var(--color-text-muted)',
                        fontStyle: 'italic',
                      }}>
                        {option.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div style={{ textAlign: 'center' }}>
            {!submitted ? (
              <button
                className="btn btn-primary btn-lg"
                disabled={!selectedOption || submitting}
                onClick={handleSubmitAnswer}
              >
                {submitting ? 'Submitting...' : 'Check Answer'}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleNext}
              >
                {isLast ? 'Continue to Scenario' : 'Next Question'}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import CreateMatch from './CreateMatch';

describe('<CreateMatch />', () => {
  test('it should mount', () => {
    render(<CreateMatch />);
    
    const createMatch = screen.getByTestId('CreateMatch');

    expect(createMatch).toBeInTheDocument();
  });
});
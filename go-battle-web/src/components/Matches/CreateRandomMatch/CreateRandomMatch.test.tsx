import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import CreateRandomMatch from './CreateRandomMatch';

describe('<CreateRandomMatch />', () => {
  test('it should mount', () => {
    render(<CreateRandomMatch />);
    
    const createRandomMatch = screen.getByTestId('CreateRandomMatch');

    expect(createRandomMatch).toBeInTheDocument();
  });
});
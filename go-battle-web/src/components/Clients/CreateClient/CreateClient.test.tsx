import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import CreateClient from './CreateClient';

describe('<CreateClient />', () => {
  test('it should mount', () => {
    render(<CreateClient />);
    
    const createClient = screen.getByTestId('CreateClient');

    expect(createClient).toBeInTheDocument();
  });
});
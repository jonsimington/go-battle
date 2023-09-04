import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import CreateGame from './CreateGame';

describe('<CreateGame />', () => {
  test('it should mount', () => {
    render(<CreateGame />);
    
    const createGame = screen.getByTestId('CreateGame');

    expect(createGame).toBeInTheDocument();
  });
});
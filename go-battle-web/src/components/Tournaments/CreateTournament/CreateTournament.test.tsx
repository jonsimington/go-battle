import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import CreateTournament from './CreateTournament';

describe('<CreateTournament />', () => {
  test('it should mount', () => {
    render(<CreateTournament />);
    
    const createTournament = screen.getByTestId('CreateTournament');

    expect(createTournament).toBeInTheDocument();
  });
});
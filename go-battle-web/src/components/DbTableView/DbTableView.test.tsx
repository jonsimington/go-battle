import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import DbTableView from './DbTableView';

describe('<DbTableView />', () => {
  test('it should mount', () => {
    render(<DbTableView context="test" />);
    
    const dbTableView = screen.getByTestId('DbTableView');

    expect(dbTableView).toBeInTheDocument();
  });
});

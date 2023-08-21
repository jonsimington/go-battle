import React, { FC } from 'react';
import styles from './DbTableView.module.css';

interface DbTableViewProps {
    context: string;
}

const DbTableView: FC<DbTableViewProps> = (props) => (
  <div className={styles.DbTableView} data-testid="DbTableView">
    DbTableView Component, context: {props.context}
  </div>
);

export default DbTableView;

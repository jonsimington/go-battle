import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { ClientsResult } from '../../../models/ClientsResult';
import { FaChessBishop, FaPython, FaJs } from 'react-icons/fa6';
import { SiCplusplus } from 'react-icons/si';
import TimeAgo from 'timeago-react';
import styles from './SearchClients.module.css';

interface SearchClientsProps {
    tableData: any[]
    refreshData: Function
}

const languageLabels: Record<string, string> = {
    py: 'Python',
    js: 'JavaScript',
    cpp: 'C++',
};

export function SearchClients({ tableData, refreshData }: SearchClientsProps): JSX.Element {

    const columns: IColumnType<ClientsResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "repo",
            title: "Repo",
            render: (_, { repo }) => {
                if (!repo) return <span className={styles.muted}>—</span>;
                return (
                    <a
                        className={styles.repoLink}
                        href={repo}
                        target="_blank"
                        rel="noopener noreferrer">
                        {repo.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                    </a>
                );
            }
        },
        {
            key: "language",
            title: "Language",
            width: 100,
            render: (_, { language }) => {
                const icon = language === 'py' ? <FaPython />
                    : language === 'js' ? <FaJs />
                    : language === 'cpp' ? <SiCplusplus />
                    : null;
                return (
                    <span className={styles.langCell}>
                        {icon && <span className={styles.langIcon}>{icon}</span>}
                        {languageLabels[language] || language}
                    </span>
                );
            }
        },
        {
            key: "game",
            title: "Game",
            width: 100,
            render: (_, { game }) => {
                return (
                    <span className={styles.gameCell}>
                        {game === 'chess' && <FaChessBishop className={styles.gameIcon} />}
                        {game}
                    </span>
                );
            }
        },
        {
            key: "CreatedAt",
            title: "Created",
            width: 120,
            render: (_, { CreatedAt }) => {
                return <TimeAgo datetime={CreatedAt} className={styles.timeAgo} />;
            }
        },
    ];

    return (
        <>
            <h3>Clients</h3>
            <DynamicTable data={tableData} columns={columns} />
        </>
    );
}

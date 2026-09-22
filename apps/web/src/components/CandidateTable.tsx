import type { Candidate } from '../api/types';
import { formatCandidateGender, formatDate, formatNumber } from '../lib/format';

type CandidateTableProps = {
  readonly candidates: readonly Candidate[];
  readonly onDelete: (candidate: Candidate) => void;
  readonly onEdit: (candidate: Candidate) => void;
  readonly onView: (candidate: Candidate) => void;
};

export const CandidateTable = ({ candidates, onDelete, onEdit, onView }: CandidateTableProps) => (
  <div className="table-card">
    <table className="data-table">
      <caption>Candidate records</caption>
      <thead>
        <tr>
          <th scope="col">Candidate</th>
          <th scope="col">Birth date</th>
          <th scope="col">Gender</th>
          <th scope="col">Current salary</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => (
          <tr key={candidate.id}>
            <td>
              <strong>{candidate.name}</strong>
              <br />
              <span className="muted-text">{candidate.email}</span>
            </td>
            <td>{formatDate(candidate.birthdate)}</td>
            <td>{formatCandidateGender(candidate.gender)}</td>
            <td>{formatNumber(candidate.currentSalary)}</td>
            <td>
              <div className="table-actions">
                <button className="text-button" onClick={() => onView(candidate)} type="button">
                  View
                </button>
                <button className="text-button" onClick={() => onEdit(candidate)} type="button">
                  Edit
                </button>
                <button
                  className="text-button text-button-danger"
                  onClick={() => onDelete(candidate)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

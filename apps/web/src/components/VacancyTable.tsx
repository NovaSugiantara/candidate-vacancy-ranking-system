import type { Vacancy } from '../api/types';
import { formatCriterionSummary } from '../lib/format';

type VacancyTableProps = {
  readonly onDelete: (vacancy: Vacancy) => void;
  readonly onEdit: (vacancy: Vacancy) => void;
  readonly onView: (vacancy: Vacancy) => void;
  readonly vacancies: readonly Vacancy[];
};

export const VacancyTable = ({ onDelete, onEdit, onView, vacancies }: VacancyTableProps) => (
  <div className="table-card">
    <table className="data-table">
      <caption>Vacancy records</caption>
      <thead>
        <tr>
          <th scope="col">Vacancy</th>
          <th scope="col">Criteria</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {vacancies.map((vacancy) => (
          <tr key={vacancy.id}>
            <td>
              <strong>{vacancy.name}</strong>
              <p className="muted-text">{vacancy.description}</p>
            </td>
            <td>
              <div className="badge-list">
                {vacancy.criteria.map((criterion) => (
                  <span className="badge" key={criterion.id}>
                    {formatCriterionSummary(criterion)} · weight {criterion.weight}
                  </span>
                ))}
              </div>
            </td>
            <td>
              <div className="table-actions">
                <button className="text-button" onClick={() => onView(vacancy)} type="button">
                  View
                </button>
                <button className="text-button" onClick={() => onEdit(vacancy)} type="button">
                  Edit
                </button>
                <button
                  className="text-button text-button-danger"
                  onClick={() => onDelete(vacancy)}
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

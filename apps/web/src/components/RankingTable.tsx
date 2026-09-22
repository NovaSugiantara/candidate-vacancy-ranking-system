import type { RankedCandidate } from '../api/types';
import { formatCriterionType } from '../lib/format';

type RankingTableProps = {
  readonly results: readonly RankedCandidate[];
};

const compareResults = (left: RankedCandidate, right: RankedCandidate): number => {
  const scoreDifference = right.score - left.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const nameDifference = left.name.localeCompare(right.name, undefined, {
    sensitivity: 'accent',
  });

  if (nameDifference !== 0) {
    return nameDifference;
  }

  return left.candidateId.localeCompare(right.candidateId);
};

export const RankingTable = ({ results }: RankingTableProps) => {
  const sortedResults = results.toSorted(compareResults);

  return (
    <div className="table-card">
      <table className="data-table">
        <caption>Candidate ranking results</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Candidate</th>
            <th scope="col">Score</th>
            <th scope="col">Criteria</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((candidate, index) => (
            <tr key={candidate.candidateId}>
              <td className="score">{index + 1}</td>
              <td>
                <strong>{candidate.name}</strong>
                <br />
                <span className="muted-text">{candidate.email}</span>
              </td>
              <td className="score">{candidate.score}</td>
              <td>
                <div className="badge-list">
                  {candidate.matchedCriteria.map((criterion, criterionIndex) => (
                    <span
                      className={`badge ${criterion.matched ? 'badge-match' : 'badge-miss'}`}
                      key={`${candidate.candidateId}-${criterion.type}-${criterionIndex}`}
                    >
                      {formatCriterionType(criterion.type)}{' '}
                      {criterion.matched ? `+${criterion.weight}` : 'not matched'}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

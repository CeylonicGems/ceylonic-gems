type ChangeValue = string | number | null;

type FieldChange = {
  before: ChangeValue;
  after: ChangeValue;
};

type AdminEditSummaryProps = {
  changes?: Record<string, FieldChange> | null;
  reason?: string | null;
  editedAt?: string | null;
};

function displayValue(value: ChangeValue) {
  if (value === null || value === "") {
    return "Not provided";
  }

  return String(value);
}

export function AdminEditSummary({
  changes,
  reason,
  editedAt,
}: AdminEditSummaryProps) {
  const entries = Object.entries(changes ?? {});

  if (entries.length === 0 && !reason) {
    return null;
  }

  return (
    <div className="admin-edit-summary">
      <strong>Seller edits</strong>

      {reason && (
        <p>
          <strong>Reason:</strong> {reason}
        </p>
      )}

      {entries.length > 0 && (
        <div className="edit-change-list">
          {entries.map(([field, change]) => (
            <div className="edit-change-row" key={field}>
              <strong>{field}</strong>

              <span>
                {displayValue(change.before)}
                {" → "}
                {displayValue(change.after)}
              </span>
            </div>
          ))}
        </div>
      )}

      {editedAt && (
        <small>
          Edited: {new Date(editedAt).toLocaleString()}
        </small>
      )}
    </div>
  );
}
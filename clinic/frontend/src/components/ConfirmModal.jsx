export default function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title || 'Confirm Action'}</h2>
        <p>{message || 'Are you sure you want to proceed?'}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

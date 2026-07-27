import './WeekTableInfo.css'

export default function WeekTableInfo({ weekStart, weekLabel, wCh, onExport, editableFromDate, isEditMode, lockHolder, savingBatch, onStartEdit, onSaveEdit, onCancelEdit }) {
  return (
    <div className="pw-week-table-info">
      {weekStart && (
        <div className="pw-week-table-info-top">
          <span><strong>Canale:</strong> {wCh}</span>
          <span><strong>Settimana:</strong> {weekLabel}</span>

          {/* Edit controls + Export — all right-aligned as a group */}
          <div className="pw-wti-actions">
            {editableFromDate !== null && (
              isEditMode ? (
                <>
                  <button className="pw-wti-btn pw-wti-btn--cancel" onClick={onCancelEdit} disabled={savingBatch}>
                    Annulla
                  </button>
                  <button className="pw-wti-btn pw-wti-btn--save" onClick={onSaveEdit} disabled={savingBatch}>
                    {savingBatch ? 'Salvataggio…' : 'Salva'}
                  </button>
                </>
              ) : lockHolder ? (
                <span className="pw-wti-lock">🔒 {lockHolder}</span>
              ) : (
                <button className="pw-wti-btn pw-wti-btn--edit" onClick={onStartEdit}>
                  ✏️ Modifica Share Manuali
                </button>
              )
            )}
            <button className="pw-export-btn pw-export-btn--styled" onClick={onExport}>
              Esporta Excel
            </button>
          </div>
        </div>
      )}
      <div className="pw-week-table-legend">
        <span><strong>Previsto</strong> = Stima WhatIF</span>
        <span><strong>Manuale</strong> = Valore inserito dall'utente</span>
        <span><strong>Auditel</strong> = Valore osservato</span>
        <span><strong>Scostamento</strong> = Auditel - (Manuale o Previsto)</span>
      </div>
    </div>
  )
}

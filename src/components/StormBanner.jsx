import { useState } from 'react';
import Icon from './Icon';

// Shown when the National Weather Service has an active flood watch/warning
// for the user's location. For now it's driven by the "Storm demo" switch;
// Phase 4 connects it to api.weather.gov.
export default function StormBanner({ onDismiss }) {
  const [showTips, setShowTips] = useState(false);

  return (
    <section className="storm-banner" aria-labelledby="storm-title">
      <div className="storm-head">
        <Icon name="warning" size={24} className="storm-icon" />
        <div className="storm-text">
          <h2 id="storm-title">
            Flood Warning in effect <span className="tag tag-warn">Demo</span>
          </h2>
          <p role="alert">Sample National Weather Service alert. Only clear drains if it is safe.</p>
        </div>
        <div className="storm-actions">
          <button type="button" className="btn btn-small btn-ghost-dark" aria-expanded={showTips} aria-controls="storm-tips" onClick={() => setShowTips((v) => !v)}>
            {showTips ? 'Hide tips' : 'Safety tips'}
          </button>
          <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss storm alert">
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>
      {showTips && (
        <div id="storm-tips" className="storm-tips">
          <div>
            <h3>Drain adopters</h3>
            <ul>
              <li>Clear drains <strong>before</strong> the rain starts, not during heavy rain or once water is pooling.</li>
              <li>Never step into floodwater. It can hide open manholes and debris.</li>
              <li>Use a rake or broom from the curb. Don't lift the grate.</li>
              <li>Still blocked? Report it to 311 and stay safe.</li>
            </ul>
          </div>
          <div>
            <h3>Basement tenants</h3>
            <ul>
              <li>Know your way out. Move important papers and medicine upstairs now.</li>
              <li>If water starts coming in, go upstairs right away.</li>
              <li>Never go into a flooded basement. The water may be touching electricity.</li>
              <li>Call 911 if you are trapped or in danger.</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

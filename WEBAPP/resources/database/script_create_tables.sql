
-- 1. Status lookup table
CREATE TABLE IF NOT EXISTS ta_coll.whatif.webapp_status (
    code        STRING  NOT NULL,
    description STRING,

    CONSTRAINT pk_webapp_status PRIMARY KEY (code)
)
USING DELTA;

INSERT INTO ta_coll.whatif.webapp_status (code, description) VALUES
    ('Running',   'Simulazione in corso'),
    ('Completed', 'Simulazione completata con successo'),
    ('Failed',    'Simulazione terminata con errore');

-- 2. Scenarios table
CREATE TABLE IF NOT EXISTS ta_coll.whatif.webapp_scenarios (
    id                    STRING     NOT NULL,
    scenario_type         STRING     NOT NULL,
    scenario_name         STRING     NOT NULL,
    program_id            STRING     NOT NULL,
    program_name          STRING     NOT NULL,
    program_channel       STRING     NOT NULL,
    program_date          DATE       NOT NULL,
    program_from_time     STRING     NOT NULL,
    program_to_time       STRING     NOT NULL,
    program_share_predict DOUBLE     NOT NULL,
    creation_date         TIMESTAMP  NOT NULL,
    modified_date         TIMESTAMP  NOT NULL,

    CONSTRAINT pk_webapp_scenarios PRIMARY KEY (id)
)
USING DELTA;

-- 3. Simulations table for Sostituzione
CREATE TABLE IF NOT EXISTS ta_coll.whatif.webapp_simulations_sostituzione (
    id                        STRING    NOT NULL,
    id_scenario               STRING    NOT NULL,
    new_program_name          STRING    NOT NULL,
    new_program_share_storico DOUBLE,
    share_result              DOUBLE,
    status                    STRING    NOT NULL,
    creation_date             TIMESTAMP NOT NULL,
    modified_date             TIMESTAMP NOT NULL,
    last_error                STRING,
    is_retry                  BOOLEAN   NOT NULL,
    user_email                STRING,
    shap_values               MAP<STRING, DOUBLE>,

    CONSTRAINT pk_webapp_simulations_sostituzione           PRIMARY KEY (id),
    CONSTRAINT fk_webapp_simulations_sostituzione_scenario  FOREIGN KEY (id_scenario) REFERENCES ta_coll.whatif.webapp_scenarios (id),
    CONSTRAINT fk_webapp_simulations_sostituzione_status    FOREIGN KEY (status)      REFERENCES ta_coll.whatif.webapp_status (code)
)
USING DELTA;

-- 4. Simulations table for Spostamento
CREATE TABLE IF NOT EXISTS ta_coll.whatif.webapp_simulations_spostamento (
    id                        STRING    NOT NULL,
    id_scenario               STRING    NOT NULL,
    new_channel               STRING    NOT NULL,
    new_date                  DATE      NOT NULL,
    new_from_time             STRING    NOT NULL,
    schedule                  ARRAY<STRING>,
    share_result              DOUBLE,
    status                    STRING    NOT NULL,
    creation_date             TIMESTAMP NOT NULL,
    modified_date             TIMESTAMP NOT NULL,
    last_error                STRING,
    is_retry                  BOOLEAN   NOT NULL,
    user_email                STRING,
    shap_values               MAP<STRING, DOUBLE>,

    CONSTRAINT pk_webapp_simulations_spostamento            PRIMARY KEY (id),
    CONSTRAINT fk_webapp_simulations_spostamento_scenario   FOREIGN KEY (id_scenario) REFERENCES ta_coll.whatif.webapp_scenarios (id),
    CONSTRAINT fk_webapp_simulations_spostamento_status     FOREIGN KEY (status)      REFERENCES ta_coll.whatif.webapp_status (code)
)
USING DELTA;

-- 5. Route audit log table
CREATE TABLE IF NOT EXISTS ta_coll.whatif.webapp_audit_log (
    id                 STRING    NOT NULL,
    event_time_utc     TIMESTAMP NOT NULL,
    operation_name     STRING    NOT NULL,
    http_method        STRING,
    route_path         STRING,
    endpoint           STRING,
    duration_ms        BIGINT,
    user_email         STRING,
    identity_source    STRING,
    user_agent         STRING,
    client_ip          STRING,
    request_id         STRING,
    client_session_id  STRING,
    parameters_json    STRING,

    CONSTRAINT pk_webapp_audit_log PRIMARY KEY (id)
)
USING DELTA;
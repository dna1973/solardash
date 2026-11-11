# Project rules

- Keep replication documentation evidence-based and separate from live migrations; source exports must exclude secrets, repository metadata, production records, dependencies and generated output because replication must not leak credentials or modify the original environment.
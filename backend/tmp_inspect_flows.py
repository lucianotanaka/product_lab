import inspect
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

import app.api.v1.endpoints.flows_data as m

print(m.__file__)
print(inspect.getsource(m.stakeholders_summary))

# Sample Script
import datetime
def job_metadata():
    d = datetime.datetime.now()
    print(f'Job was invoked at {d.strftime("%c")}')
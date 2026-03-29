# Sample Script
import datetime
def welcomeMessage():
    d = datetime.datetime.now()
    
    print(f'Welcome. This sample script was invoked at: {d.strftime("%c")}')
# Test Notebook(s)
Contains collection of jupyter notebooks to test various scenarios

## Prerequisites
Sagemaker Domain will be deployed within a VPC/Subnet. Ensure that the Security Group Ingress/Egress rules allow required connectivity to the AWS/OnPrem/Target Network resources

VPC Endpoints to be in place such as:
* "com.amazonaws.<REGION>.kms"
* "com.amazonaws.<REGION>.athena"
* "com.amazonaws.<REGION>.bedrock"
* "com.amazonaws.<REGION>.glue"
* "com.amazonaws.<REGION>.sagemaker.featurestore-runtime"
* "com.amazonaws.<REGION>.sagemaker.runtime"
* "com.amazonaws.<REGION>.sagemaker.api"
* "aws.sagemaker.<REGION>.notebook"
* "com.amazonaws.<REGION>.sts"
* "com.amazonaws.<REGION>.logs"


## General Instructions
Data Scientist/AI engineer who has access to the SSO Group should be able to launch the Sagemaker Studio or `Application` directly from the SSO Login page.
* Once logged in, go to AWS Access Portal
* Select 'Applicaitons' Tab
* Hover over the applications to see which `domain` do they belong to (in case you see multiple applicaitons)
* Refer to `Domain >> ID`. Request your Administrator to provide this id. (Example: *d-bdmy11uf4r3o*)
* It will launch your `Sagemaker Studio` in a new tab
* Click on `JupyterLab` and then click `Create Jupyter Lab Space`
* Provide an appropriate name and click "Create Space"
* Wait for Space to be created and then Click "Start"
* Once the status is *Running* , you will see a button 'Open'. Click it
* It will upload your `Jupyter Lab` personal environment
* On your Left hand side, you will see 'Upload File' Option. Click on it and browse to your local repo, /ai/datascience-team/notebooks folder. You will see a `test.ipynb` file. 
* Select the file and Click 'Open'
* Execute Notebook Cells (Shift+Enter) and if it runs fine all the way, your deployment is successful

## 1. Notebook: basic_test.ipynb
This is a notebook to test the following:
1. Running within Sagemaker Studio, using the execution role
2. No Internet connectivity - should be able to use pre-installed modules
3. Should be able to read/write to S3-Bucket 
"""
Default placeholder DAG deployed by MDAA when no dagPath is specified.
This ensures the MWAA environment can start successfully (MWAA requires
at least one .py file in the DAGs path).

Replace this file with your own DAGs by specifying dagPath in the module config.
"""

from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime


def hello():
    print("Hello from MDAA MWAA!")


with DAG(
    dag_id="mdaa_hello",
    start_date=datetime(2024, 1, 1),
    schedule=None,
    catchup=False,
    tags=["mdaa", "placeholder"],
) as dag:
    PythonOperator(
        task_id="hello_task",
        python_callable=hello,
    )

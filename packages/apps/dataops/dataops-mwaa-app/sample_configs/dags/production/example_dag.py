"""Example DAG for the comprehensive sample configuration."""

from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime


def run_etl():
    print("Running ETL pipeline")


with DAG(
    dag_id="example_etl_pipeline",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["example", "etl"],
) as dag:
    PythonOperator(
        task_id="run_etl",
        python_callable=run_etl,
    )

#!/usr/bin/env python3
"""
Service Interruption Manager Utility

This utility provides programmatic control over service interruption state.
It allows administrators to activate/deactivate service interruptions with
custom messages for maintenance, debugging, or emergency situations.

Usage:
    python interruption-manager.py activate --message "Scheduled maintenance in progress"
    python interruption-manager.py deactivate
    python interruption-manager.py status
    python interruption-manager.py activate --service bedrock-rag --message "RAG service under maintenance"

Features:
- Global and per-service interruption control
- Custom interruption messages
- Activation metadata (timestamp, operator)
- Status checking and reporting
- Support for temporary interruptions with TTL
"""

import argparse
import boto3
import json
import time
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any
import os
import sys


class ServiceInterruptionManager:
    """
    Manager class for controlling service interruption state via DynamoDB.
    
    This is a CLI utility for administrators to manage service interruptions.
    For API-based management, see the Bot Management API endpoints in the REST API.
    
    The DynamoDB table is expected to have a small number of items (one per service type),
    so full table scans are acceptable for status queries.
    """
    
    # Maximum message length to prevent DynamoDB item size issues
    MAX_MESSAGE_LENGTH = 1000
    
    def __init__(self, table_name: str, region: str = 'ca-central-1'):
        """
        Initialize the service interruption manager.
        
        Args:
            table_name: DynamoDB table name for interruption settings
            region: AWS region for DynamoDB client
        """
        self.table_name = table_name
        self.region = region
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)
    
    def activate_interruption(self, 
                            service_type: str = 'global',
                            message: str = 'Service temporarily unavailable. Please try again later.',
                            reason: Optional[str] = None,
                            activated_by: Optional[str] = None,
                            duration_minutes: Optional[int] = None) -> Dict[str, Any]:
        """
        Activate service interruption.
        
        Args:
            service_type: Service type ('global', 'bedrock-rag', 'bedrock-invoke-model', etc.)
            message: Custom interruption message (max 1000 characters)
            reason: Reason for interruption (optional)
            activated_by: Who activated the interruption (optional)
            duration_minutes: Auto-deactivate after N minutes (optional)
            
        Returns:
            Dictionary with operation result
        """
        # Validate and truncate message length
        if len(message) > self.MAX_MESSAGE_LENGTH:
            message = message[:self.MAX_MESSAGE_LENGTH]
        
        current_time = datetime.now(UTC)
        
        # Prepare the item
        item = {
            'id': service_type,
            'isActive': True,
            'message': message,
            'scope': 'service' if service_type != 'global' else 'global',
            'activatedAt': current_time.isoformat(),
            'activatedBy': activated_by or os.environ.get('USER', 'unknown'),
            'reason': reason,
            'lastUpdated': current_time.isoformat()
        }
        
        # Add TTL if duration is specified
        if duration_minutes:
            ttl_time = current_time + timedelta(minutes=duration_minutes)
            item['ttl'] = int(ttl_time.timestamp())
        
        try:
            self.table.put_item(Item=item)
            
            result = {
                'success': True,
                'message': f'Service interruption activated for {service_type}',
                'service_type': service_type,
                'interruption_message': message,
                'activated_at': current_time.isoformat(),
                'activated_by': item['activatedBy'],
                'duration_minutes': duration_minutes
            }
            
            if duration_minutes:
                result['auto_deactivate_at'] = ttl_time.isoformat()
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to activate service interruption: {str(e)}'
            }
    
    def deactivate_interruption(self, service_type: str = 'global') -> Dict[str, Any]:
        """
        Deactivate service interruption.
        
        Args:
            service_type: Service type to deactivate
            
        Returns:
            Dictionary with operation result
        """
        try:
            # Check if interruption exists and is active
            response = self.table.get_item(Key={'id': service_type})
            
            if 'Item' not in response:
                return {
                    'success': False,
                    'message': f'No interruption found for {service_type}'
                }
            
            current_item = response['Item']
            if not current_item.get('isActive', False):
                return {
                    'success': False,
                    'message': f'Service interruption for {service_type} is already inactive'
                }
            
            # Update the item to deactivate
            current_time = datetime.now(UTC)
            self.table.update_item(
                Key={'id': service_type},
                UpdateExpression='SET isActive = :inactive, deactivatedAt = :deactivated_at, lastUpdated = :last_updated REMOVE #ttl',
                ExpressionAttributeNames={'#ttl': 'ttl'},
                ExpressionAttributeValues={
                    ':inactive': False,
                    ':deactivated_at': current_time.isoformat(),
                    ':last_updated': current_time.isoformat()
                }
            )
            
            return {
                'success': True,
                'message': f'Service interruption deactivated for {service_type}',
                'service_type': service_type,
                'deactivated_at': current_time.isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to deactivate service interruption: {str(e)}'
            }
    
    def get_interruption_status(self, service_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get current interruption status.
        
        Args:
            service_type: Specific service type to check, or None for all
            
        Returns:
            Dictionary with status information
        """
        try:
            if service_type:
                # Get specific service status
                response = self.table.get_item(Key={'id': service_type})
                
                if 'Item' not in response:
                    return {
                        'success': True,
                        'service_type': service_type,
                        'is_active': False,
                        'message': 'No interruption configured'
                    }
                
                item = response['Item']
                return {
                    'success': True,
                    'service_type': service_type,
                    'is_active': item.get('isActive', False),
                    'message': item.get('message', ''),
                    'scope': item.get('scope', ''),
                    'activated_at': item.get('activatedAt'),
                    'activated_by': item.get('activatedBy'),
                    'reason': item.get('reason'),
                    'last_updated': item.get('lastUpdated'),
                    'ttl': item.get('ttl'),
                    'auto_deactivate_at': datetime.fromtimestamp(item.get('ttl'), UTC).isoformat() if item.get('ttl') else None
                }
            else:
                # Get all interruption statuses
                response = self.table.scan()
                interruptions = []
                
                for item in response['Items']:
                    interruption = {
                        'service_type': item['id'],
                        'is_active': item.get('isActive', False),
                        'message': item.get('message', ''),
                        'scope': item.get('scope', ''),
                        'activated_at': item.get('activatedAt'),
                        'activated_by': item.get('activatedBy'),
                        'reason': item.get('reason'),
                        'last_updated': item.get('lastUpdated'),
                        'ttl': item.get('ttl'),
                        'auto_deactivate_at': datetime.fromtimestamp(item.get('ttl'), UTC).isoformat() if item.get('ttl') else None
                    }
                    interruptions.append(interruption)
                
                return {
                    'success': True,
                    'interruptions': interruptions,
                    'total_count': len(interruptions),
                    'active_count': len([i for i in interruptions if i['is_active']])
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to get interruption status: {str(e)}'
            }
    
    def list_active_interruptions(self) -> Dict[str, Any]:
        """
        List all currently active interruptions.
        
        Returns:
            Dictionary with active interruptions
        """
        try:
            response = self.table.scan(
                FilterExpression='isActive = :true',
                ExpressionAttributeValues={':true': True}
            )
            
            active_interruptions = []
            for item in response['Items']:
                interruption = {
                    'service_type': item['id'],
                    'message': item.get('message', ''),
                    'scope': item.get('scope', ''),
                    'activated_at': item.get('activatedAt'),
                    'activated_by': item.get('activatedBy'),
                    'reason': item.get('reason'),
                    'auto_deactivate_at': datetime.fromtimestamp(item.get('ttl'), UTC).isoformat() if item.get('ttl') else None
                }
                active_interruptions.append(interruption)
            
            return {
                'success': True,
                'active_interruptions': active_interruptions,
                'count': len(active_interruptions)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to list active interruptions: {str(e)}'
            }


def main():
    """
    Command-line interface for service interruption management.
    """
    parser = argparse.ArgumentParser(description='Service Interruption Manager')
    parser.add_argument('--table-name', required=True, help='DynamoDB table name')
    parser.add_argument('--region', default='ca-central-1', help='AWS region')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Activate command
    activate_parser = subparsers.add_parser('activate', help='Activate service interruption')
    activate_parser.add_argument('--service', default='global', help='Service type (default: global)')
    activate_parser.add_argument('--message', required=True, help='Interruption message')
    activate_parser.add_argument('--reason', help='Reason for interruption')
    activate_parser.add_argument('--operator', help='Who is activating the interruption')
    activate_parser.add_argument('--duration', type=int, help='Auto-deactivate after N minutes')
    
    # Deactivate command
    deactivate_parser = subparsers.add_parser('deactivate', help='Deactivate service interruption')
    deactivate_parser.add_argument('--service', default='global', help='Service type (default: global)')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Get interruption status')
    status_parser.add_argument('--service', help='Specific service type (default: all)')
    
    # List command 
    subparsers.add_parser('list', help='List active interruptions')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize manager
    manager = ServiceInterruptionManager(args.table_name, args.region)
    
    # Execute command
    if args.command == 'activate':
        result = manager.activate_interruption(
            service_type=args.service,
            message=args.message,
            reason=args.reason,
            activated_by=args.operator,
            duration_minutes=args.duration
        )
    elif args.command == 'deactivate':
        result = manager.deactivate_interruption(args.service)
    elif args.command == 'status':
        result = manager.get_interruption_status(args.service)
    elif args.command == 'list':
        result = manager.list_active_interruptions()
    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)
    
    # Print result
    print(json.dumps(result, indent=2, default=str))
    
    # Exit with appropriate code
    sys.exit(0 if result.get('success', False) else 1)


if __name__ == '__main__':
    main()
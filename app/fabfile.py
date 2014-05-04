#!/usr/bin/env python

import os

from fabric.api import *

"""
Base configuration
"""

env.repo_url = 'git@github.com:NUKnightLab/fao-explorer.git'
env.settings = None

def configure_targets(deployment_target):
    """
    Configure deployment targets. Abstracted so this can be
    overriden for rendering before deployment.
    """
    global S3_BUCKETS
    global S3_BASE_URL
    global DEBUG
    global DEPLOYMENT_TARGET

    PRODUCTION_S3_BUCKETS = ['fao-explorer.knightlab.com']
    STAGING_S3_BUCKETS = ['fao-explorer.knilab.com']

    if deployment_target == 'production':
        S3_BUCKETS = PRODUCTION_S3_BUCKETS
        S3_BASE_URL = 'http://%s' % (S3_BUCKETS[0])
        DEBUG = False
    elif deployment_target == 'staging':
        S3_BUCKETS = STAGING_S3_BUCKETS
        S3_BASE_URL = 'http://%s' % (S3_BUCKETS[0])
        DEBUG = True
    else:
        S3_BUCKETS = []
        S3_BASE_URL = 'http://127.0.0.1:8000'
        DEBUG = True

    DEPLOYMENT_TARGET = deployment_target



"""
Environments

Changing environment requires a full-stack test.
An environment points to both a server and an S3
bucket.
"""
@task
def production():
    """
    Run as though on production.
    """
    env.settings = 'production'
    configure_targets(env.settings)

@task
def staging():
    """
    Run as though on staging.
    """
    env.settings = 'staging'
    configure_targets(env.settings)


"""
Branches

Changing branches requires deploying that branch to a host.
"""
@task
def stable():
    """
    Work on stable branch.
    """
    env.branch = 'stable'

@task
def master():
    """
    Work on development branch.
    """
    env.branch = 'master'

@task
def branch(branch_name):
    """
    Work on any specified branch.
    """
    env.branch = branch_name

"""
Deployment

Changes to deployment requires a full-stack test. Deployment
has two primary functions: Pushing flat files to S3 and deploying
code to a remote server if required.
"""
@task
def deploy(path='static'):
    """
    Deploy the stuff to S3.
    """
    require('settings', provided_by=[production, staging])

    sync = 'aws s3 sync %s/ %s --acl "public-read" --cache-control "max-age=5" --region "us-east-1"'

    for bucket in S3_BUCKETS:
        local(sync % (path, 's3://%s/' % (bucket)))

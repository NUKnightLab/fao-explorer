fao-explorer
============

[fao-explorer.knightlab.com/china.html](http://fao-explorer.knightlab.com/china.html)

Example components from a potentially larger tool that supports exploring data over time on a country-by-country basis. This data focuses on China, India, Nigeria and Brazil. Current components include population data from the UN against LANDSAT imagery from Google Earth Engine and livestock production vs. investment in various types of agriculture.

## Data components

The `data` folder contains raw data and various scripts for transformaton. Not all of this data will be used in the application, but we explored many different statistics for possible correlation. The data transformation uses the `pandas` library. 

## App components

The `app` folder contains the frontend of the application. There is a flask app here that is not really used as well as a `fabfile` for deployment. To develop on the app, `pip install -r requirements.txt` to use Fabric.

### Deployment

First, configure your AWS key and secret by exporting them as environment variables in your bash/zsh profile:

```
export AWS_ACCESS_KEY_ID="lolololololsecurity"
export AWS_SECRET_ACCESS_KEY="lololololsecurity"
```

Reload your environment, and run `fab production master deploy` to deploy to our s3 bucket, [fao-explorer.knightlab.com](http://fao-explorer.knightlab.com). 
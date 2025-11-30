#!/usr/bin/env python3
"""
Export OpenAPI specification from FastAPI application.

Usage:
    python3 export_openapi.py [output_file]

If no output file is specified, prints to stdout.
Automatically generates both JSON and YAML formats if filename has .json/.yaml extension.
"""
import json
import sys
from pathlib import Path

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

# Import your FastAPI app
from main import app


def export_openapi(output_path: str | None = None):
    """Export OpenAPI spec to file or stdout."""
    openapi_schema = app.openapi()
    
    if output_path:
        output_file = Path(output_path)
        
        # Export JSON
        if output_file.suffix == '.json' or output_file.suffix == '':
            json_path = output_file if output_file.suffix == '.json' else output_file.with_suffix('.json')
            json_content = json.dumps(openapi_schema, indent=2)
            json_path.write_text(json_content)
            print(f"✅ OpenAPI spec (JSON) exported to: {json_path}")
        
        # Export YAML if pyyaml is installed
        if HAS_YAML and (output_file.suffix == '.yaml' or output_file.suffix == '.yml'):
            yaml_content = yaml.dump(openapi_schema, sort_keys=False, allow_unicode=True)
            output_file.write_text(yaml_content)
            print(f"✅ OpenAPI spec (YAML) exported to: {output_file}")
        elif not HAS_YAML and output_file.suffix in ['.yaml', '.yml']:
            print("⚠️  PyYAML not installed. Install with: pip install pyyaml")
            print("   Exporting JSON instead...")
            json_path = output_file.with_suffix('.json')
            json_content = json.dumps(openapi_schema, indent=2)
            json_path.write_text(json_content)
            print(f"✅ OpenAPI spec (JSON) exported to: {json_path}")
    else:
        # Print to stdout
        print(json.dumps(openapi_schema, indent=2))


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else None
    
    try:
        export_openapi(output)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

from flask import jsonify

def _api_response(data=None, message="", success=True, meta=None, errors=None):
    return jsonify({
        "success": success,
        "message": message,
        "data": data,
        "errors": errors,
        "meta": meta or {}
    })

#Helpers
def success(data=None, message="", meta=None):
    return _api_response(
        success=True,
        message=message,
        data=data,
        errors=None,
        meta=meta or {}
    )

def error(message="", errors=None):
    return _api_response(
        success=False,
        message=message,
        data=None,
        errors=errors,
        meta={}
    )
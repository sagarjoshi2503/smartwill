# Provisions the secrets themselves — values are NOT set here. Set them
# manually afterward, e.g.:
#   aws secretsmanager put-secret-value --secret-id JWT_SECRET_KEY --secret-string '...'
resource "aws_secretsmanager_secret" "this" {
  for_each = toset(var.secret_names)

  name = each.value
  tags = var.tags
}
